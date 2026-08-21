package br.com.arenadev.realtime;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BuzzerService {
    private final BuzzerRoundRepository roundRepository;
    private final BuzzerPressRepository pressRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionJoinService joinService;
    private final SessionRealtimeGateway realtimeGateway;

    public BuzzerService(
            BuzzerRoundRepository roundRepository,
            BuzzerPressRepository pressRepository,
            ClassSessionRepository sessionRepository,
            SessionJoinService joinService,
            SessionRealtimeGateway realtimeGateway
    ) {
        this.roundRepository = roundRepository;
        this.pressRepository = pressRepository;
        this.sessionRepository = sessionRepository;
        this.joinService = joinService;
        this.realtimeGateway = realtimeGateway;
    }

    @Transactional(readOnly = true)
    public BuzzerStateView state(UUID sessionId) {
        ensureSessionExists(sessionId);
        return stateInternal(sessionId);
    }

    @Transactional
    public BuzzerStateView open(UUID sessionId) {
        ClassSession session = getActiveSession(sessionId);
        roundRepository.findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .ifPresent(round -> {
                    round.close();
                    roundRepository.save(round);
                    roundRepository.flush();
                });
        roundRepository.save(new BuzzerRound(session));
        BuzzerStateView state = stateInternal(sessionId);
        realtimeGateway.broadcast(sessionId, "BUZZER_STATE", state);
        return state;
    }

    @Transactional
    public BuzzerStateView close(UUID sessionId) {
        getActiveSession(sessionId);
        roundRepository.findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .ifPresent(BuzzerRound::close);
        BuzzerStateView state = stateInternal(sessionId);
        realtimeGateway.broadcast(sessionId, "BUZZER_STATE", state);
        return state;
    }

    @Transactional
    public void closeForFinishedSession(UUID sessionId) {
        roundRepository.findFirstBySessionIdAndStatusOrderByOpenedAtDesc(sessionId, BuzzerRoundStatus.OPEN)
                .ifPresent(BuzzerRound::close);
        realtimeGateway.broadcast(sessionId, "SESSION_FINISHED", java.util.Map.of("sessionId", sessionId));
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

        if (pressRepository.findByRoundIdAndParticipantId(round.getId(), participant.getId()).isEmpty()) {
            int position = Math.toIntExact(pressRepository.countByRoundId(round.getId()) + 1);
            pressRepository.save(new BuzzerPress(round, participant, position));
        }

        BuzzerStateView state = stateInternal(sessionId);
        realtimeGateway.broadcast(sessionId, "BUZZER_STATE", state);
        return state;
    }

    private BuzzerStateView stateInternal(UUID sessionId) {
        BuzzerRound round = roundRepository.findFirstBySessionIdOrderByOpenedAtDesc(sessionId).orElse(null);
        if (round == null) return new BuzzerStateView("IDLE", null, null, null, List.of());

        List<BuzzerPressView> presses = pressRepository.findByRoundIdOrderByPositionAsc(round.getId())
                .stream()
                .map(BuzzerPressView::from)
                .toList();
        return new BuzzerStateView(
                round.getStatus().name(),
                round.getId(),
                round.getOpenedAt().toString(),
                round.getClosedAt() == null ? null : round.getClosedAt().toString(),
                presses
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

    public record BuzzerPressView(
            UUID id,
            UUID participantId,
            UUID studentId,
            String name,
            String nickname,
            int position,
            String receivedAt
    ) {
        static BuzzerPressView from(BuzzerPress press) {
            Student student = press.getParticipant().getStudent();
            return new BuzzerPressView(
                    press.getId(),
                    press.getParticipant().getId(),
                    student.getId(),
                    student.getName(),
                    student.getNickname(),
                    press.getPosition(),
                    press.getReceivedAt().toString()
            );
        }
    }
}
