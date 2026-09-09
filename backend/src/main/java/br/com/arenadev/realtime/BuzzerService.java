package br.com.arenadev.realtime;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.identity.DisplayNamePolicy;
import br.com.arenadev.identity.DisplayNameService;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.sessionevent.SessionEventActor;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BuzzerService {
    private final BuzzerRoundRepository roundRepository;
    private final BuzzerPressRepository pressRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionJoinService joinService;
    private final SessionRealtimeGateway realtimeGateway;
    private final LiveStageService liveStageService;
    private final DisplayNameService displayNameService;
    private final SessionEventService sessionEventService;

    public BuzzerService(
            BuzzerRoundRepository roundRepository,
            BuzzerPressRepository pressRepository,
            ClassSessionRepository sessionRepository,
            SessionJoinService joinService,
            SessionRealtimeGateway realtimeGateway,
            LiveStageService liveStageService,
            DisplayNameService displayNameService,
            SessionEventService sessionEventService
    ) {
        this.roundRepository = roundRepository;
        this.pressRepository = pressRepository;
        this.sessionRepository = sessionRepository;
        this.joinService = joinService;
        this.realtimeGateway = realtimeGateway;
        this.liveStageService = liveStageService;
        this.displayNameService = displayNameService;
        this.sessionEventService = sessionEventService;
    }

    @Transactional(readOnly = true)
    public BuzzerStateView state(UUID sessionId) {
        ensureSessionExists(sessionId);
        return stateInternal(sessionId);
    }

    @Transactional
    public BuzzerStateView open(UUID sessionId) {
        ClassSession session = getActiveSession(sessionId);
        BuzzerRound previousOpen = roundRepository
                .findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .orElse(null);
        if (previousOpen != null) {
            long pressCount = pressRepository.countByRoundId(previousOpen.getId());
            previousOpen.close();
            roundRepository.save(previousOpen);
            roundRepository.flush();
            sessionEventService.record(
                    session,
                    SessionEventType.BUZZER_CLOSED,
                    SessionEventActor.TEACHER,
                    "Buzzer anterior encerrado ao abrir uma nova rodada.",
                    Map.of(
                            "roundId", previousOpen.getId().toString(),
                            "pressCount", pressCount,
                            "reason", "REOPENED"
                    )
            );
        }
        BuzzerRound round = roundRepository.save(new BuzzerRound(session));
        BuzzerStateView state = stateInternal(sessionId);
        liveStageService.showBuzzer(sessionId, round.getId());
        broadcastStateAfterCommit(sessionId, state);
        sessionEventService.record(
                session,
                SessionEventType.BUZZER_OPENED,
                SessionEventActor.TEACHER,
                "Buzzer aberto para a turma.",
                Map.of("roundId", round.getId().toString())
        );
        return state;
    }

    @Transactional
    public BuzzerStateView close(UUID sessionId) {
        ClassSession session = getActiveSession(sessionId);
        boolean closed = roundRepository
                .findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .map(round -> {
                    round.close();
                    return true;
                })
                .orElse(false);
        BuzzerStateView state = stateInternal(sessionId);
        broadcastStateAfterCommit(sessionId, state);
        if (closed) {
            sessionEventService.record(
                    session,
                    SessionEventType.BUZZER_CLOSED,
                    SessionEventActor.TEACHER,
                    "Buzzer encerrado com " + state.presses().size() + " acionamento(s).",
                    Map.of("pressCount", state.presses().size())
            );
        }
        return state;
    }

    @Transactional
    public void closeForFinishedSession(UUID sessionId) {
        roundRepository.findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .ifPresent(BuzzerRound::close);
        realtimeGateway.broadcastAfterCommit(sessionId, "SESSION_FINISHED", java.util.Map.of("sessionId", sessionId));
    }

    @Transactional
    public BuzzerStateView press(UUID sessionId, String participantToken) {
        getActiveSession(sessionId);
        SessionParticipant participant = joinService.validateParticipantToken(sessionId, participantToken);
        if (!participant.isPresent()) {
            throw new IllegalArgumentException("Sua presença ainda não está liberada pelo professor.");
        }
        BuzzerRound round = roundRepository
                .findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .orElseThrow(() -> new IllegalArgumentException("O Buzzer está fechado."));

        if (pressRepository.findByRoundIdAndParticipantId(round.getId(), participant.getId()).isPresent()) {
            return stateInternal(sessionId);
        }

        int position = Math.toIntExact(pressRepository.countByRoundId(round.getId()) + 1);
        pressRepository.save(new BuzzerPress(round, participant, position));
        pressRepository.flush();

        BuzzerStateView state = stateInternal(sessionId);
        broadcastStateAfterCommit(sessionId, state);
        return state;
    }


    @Transactional(readOnly = true)
    public ParticipantBuzzerStateView participantState(UUID sessionId, UUID participantId) {
        ensureSessionExists(sessionId);
        BuzzerRound round = roundRepository.findFirstBySessionIdOrderByOpenedAtDesc(sessionId).orElse(null);
        if (round == null) return ParticipantBuzzerStateView.empty();
        Integer position = pressRepository.findByRoundIdAndParticipantId(round.getId(), participantId)
                .map(BuzzerPress::getPosition)
                .orElse(null);
        return new ParticipantBuzzerStateView(round.getId(), position);
    }

    @Transactional(readOnly = true)
    public PublicBuzzerStateView projectorState(UUID sessionId) {
        ensureSessionExists(sessionId);
        return publicState(stateInternal(sessionId));
    }

    private BuzzerStateView stateInternal(UUID sessionId) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        BuzzerRound round = roundRepository.findFirstBySessionIdOrderByOpenedAtDesc(sessionId).orElse(null);
        if (round == null) return new BuzzerStateView("IDLE", null, null, null, List.of());

        List<BuzzerPressView> presses = pressRepository.findByRoundIdOrderByPositionAsc(round.getId())
                .stream()
                .map(press -> toPressView(session, press))
                .toList();
        return new BuzzerStateView(
                round.getStatus().name(),
                round.getId(),
                round.getOpenedAt().toString(),
                round.getClosedAt() == null ? null : round.getClosedAt().toString(),
                presses
        );
    }


    private void broadcastStateAfterCommit(UUID sessionId, BuzzerStateView state) {
        PublicBuzzerStateView publicState = publicState(state);
        realtimeGateway.broadcastTeachersAfterCommit(sessionId, "BUZZER_STATE", state);
        realtimeGateway.broadcastParticipantsAfterCommit(sessionId, "BUZZER_STATE", publicState);
        realtimeGateway.broadcastProjectorsAfterCommit(sessionId, "BUZZER_STATE", publicState);
    }

    private BuzzerPressView toPressView(ClassSession session, BuzzerPress press) {
        Student student = press.getParticipant().getStudent();
        return new BuzzerPressView(
                press.getId(),
                press.getParticipant().getId(),
                student.getId(),
                student.getName(),
                student.getNickname(),
                displayNameService.resolve(session.getClassroom().getId(), student, DisplayNamePolicy.PREFERRED_NAME),
                press.getPosition(),
                press.getReceivedAt().toString()
        );
    }

    private static PublicBuzzerStateView publicState(BuzzerStateView state) {
        return new PublicBuzzerStateView(
                state.status(),
                state.roundId(),
                state.openedAt(),
                state.closedAt(),
                state.presses().stream()
                        .map(press -> new PublicBuzzerPressView(
                                press.position(),
                                press.displayName(),
                                press.receivedAt()
                        ))
                        .toList()
        );
    }

    private void ensureSessionExists(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) throw new ResourceNotFoundException("Sessão não encontrada.");
    }

    private ClassSession getActiveSession(UUID sessionId) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus() != SessionStatus.ACTIVE) throw new IllegalArgumentException("Sessão não está ativa.");
        return session;
    }

    public record BuzzerStateView(
            String status,
            UUID roundId,
            String openedAt,
            String closedAt,
            List<BuzzerPressView> presses
    ) {
    }


    public record PublicBuzzerStateView(
            String status,
            UUID roundId,
            String openedAt,
            String closedAt,
            List<PublicBuzzerPressView> presses
    ) {
    }

    public record PublicBuzzerPressView(
            int position,
            String displayName,
            String receivedAt
    ) {
    }

    public record ParticipantBuzzerStateView(UUID roundId, Integer position) {
        public static ParticipantBuzzerStateView empty() {
            return new ParticipantBuzzerStateView(null, null);
        }
    }

    public record BuzzerPressView(
            UUID id,
            UUID participantId,
            UUID studentId,
            String name,
            String nickname,
            String displayName,
            int position,
            String receivedAt
    ) {
    }
}
