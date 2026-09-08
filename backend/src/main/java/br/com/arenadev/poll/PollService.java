package br.com.arenadev.poll;

import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PollService {
    public static final int MAX_PROMPT_LENGTH = 280;
    public static final int MIN_OPTIONS = 2;
    public static final int MAX_OPTIONS = 6;
    public static final int MAX_OPTION_LENGTH = 160;

    private static final Set<PollStatus> OPEN_STATUSES = Set.of(
            PollStatus.OPEN,
            PollStatus.REVEALED
    );

    private final PollRoundRepository roundRepository;
    private final PollVoteRepository voteRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SessionRealtimeGateway realtimeGateway;
    private final LiveStageService liveStageService;

    public PollService(
            PollRoundRepository roundRepository,
            PollVoteRepository voteRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            SessionRealtimeGateway realtimeGateway,
            LiveStageService liveStageService
    ) {
        this.roundRepository = roundRepository;
        this.voteRepository = voteRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.realtimeGateway = realtimeGateway;
        this.liveStageService = liveStageService;
    }

    @Transactional
    public StateView create(UUID sessionId, CreateCommand command) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        ensureActive(session);

        String prompt = normalizePrompt(command.prompt());
        List<String> options = normalizeOptions(command.options());
        List<PollRound> openRounds = roundRepository.findOpenBySessionIdForUpdate(sessionId, OPEN_STATUSES);
        if (openRounds.stream().anyMatch(PollRound::acceptsVotes)) {
            throw new IllegalArgumentException("Já existe uma votação aberta nesta sessão.");
        }

        PollRound round = new PollRound(session, prompt, command.liveResults());
        for (int index = 0; index < options.size(); index++) {
            round.addOption(options.get(index), index);
        }
        roundRepository.save(round);

        StateView teacher = stateOf(round, Projection.TEACHER);
        liveStageService.showPoll(sessionId, round.getId());
        broadcastStateAfterCommit(sessionId, round);
        return teacher;
    }

    @Transactional(readOnly = true)
    public StateView state(UUID sessionId) {
        getSession(sessionId);
        return latestRound(sessionId)
                .map(round -> stateOf(round, Projection.TEACHER))
                .orElseGet(StateView::empty);
    }

    @Transactional(readOnly = true)
    public StateView publicState(UUID sessionId) {
        getSession(sessionId);
        return latestRound(sessionId)
                .map(round -> stateOf(round, Projection.PUBLIC))
                .orElseGet(StateView::empty);
    }

    @Transactional
    public StateView reveal(UUID sessionId, UUID roundId) {
        ensureActive(getSession(sessionId));
        PollRound round = lockRound(sessionId, roundId);
        round.reveal(Instant.now());
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public StateView close(UUID sessionId, UUID roundId) {
        ensureActive(getSession(sessionId));
        PollRound round = lockRound(sessionId, roundId);
        round.close(Instant.now());
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public ParticipantStateView vote(UUID sessionId, UUID participantId, UUID optionId) {
        ensureActive(getSession(sessionId));
        PollRound round = latestOpenRoundForUpdate(sessionId);
        if (!round.acceptsVotes()) {
            throw new IllegalArgumentException("A votação já foi encerrada.");
        }

        SessionParticipant participant = participantRepository.findByIdAndSessionIdForUpdate(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado nesta sessão."));
        PollOption option = round.getOptions().stream()
                .filter(item -> item.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Opção inválida para esta votação."));

        var existing = voteRepository.findByRoundIdAndParticipantId(round.getId(), participantId);
        if (existing.isPresent()) {
            if (existing.get().getOption().getId().equals(optionId)) {
                return participantStateOf(round, participantId);
            }
            throw new IllegalArgumentException("Seu voto já foi registrado nesta votação.");
        }

        voteRepository.save(new PollVote(round, participant, option));
        broadcastStateAfterCommit(sessionId, round);
        return participantStateOf(round, participantId);
    }

    @Transactional(readOnly = true)
    public ParticipantStateView participantState(UUID sessionId, UUID participantId) {
        getSession(sessionId);
        participantRepository.findByIdAndSessionId(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado nesta sessão."));
        return latestRound(sessionId)
                .map(round -> participantStateOf(round, participantId))
                .orElseGet(ParticipantStateView::empty);
    }

    @Transactional
    public void closeOpenForFinishedSession(UUID sessionId) {
        List<PollRound> openRounds = roundRepository.findOpenBySessionIdForUpdate(sessionId, OPEN_STATUSES);
        if (openRounds.isEmpty()) return;
        Instant now = Instant.now();
        openRounds.forEach(round -> round.close(now));
        broadcastStateAfterCommit(sessionId, openRounds.getFirst());
    }

    private StateView stateOf(PollRound round, Projection projection) {
        List<PollVote> votes = voteRepository.findByRoundIdOrderByCreatedAtAsc(round.getId());
        Map<UUID, Integer> counts = new LinkedHashMap<>();
        for (PollOption option : round.getOptions()) counts.put(option.getId(), 0);
        for (PollVote vote : votes) counts.computeIfPresent(vote.getOption().getId(), (ignored, value) -> value + 1);

        int totalVotes = votes.size();
        boolean publicResultsVisible = round.resultsVisiblePublicly();
        boolean exposeCounts = projection == Projection.TEACHER || publicResultsVisible;

        List<OptionView> options = round.getOptions().stream()
                .map(option -> {
                    int count = counts.getOrDefault(option.getId(), 0);
                    Double percentage = totalVotes == 0 ? 0d : (count * 100d) / totalVotes;
                    return new OptionView(
                            option.getId(),
                            option.getLabel(),
                            option.getPosition(),
                            exposeCounts ? count : null,
                            exposeCounts ? percentage : null
                    );
                })
                .toList();

        return new StateView(new RoundView(
                round.getId(),
                round.getSession().getId(),
                round.getPrompt(),
                round.getStatus(),
                round.isLiveResults(),
                publicResultsVisible,
                totalVotes,
                options,
                round.getRevealedAt(),
                round.getClosedAt(),
                round.getCreatedAt(),
                round.getUpdatedAt()
        ));
    }

    private ParticipantStateView participantStateOf(PollRound round, UUID participantId) {
        UUID selected = voteRepository.findByRoundIdAndParticipantId(round.getId(), participantId)
                .map(vote -> vote.getOption().getId())
                .orElse(null);
        return new ParticipantStateView(
                round.getId(),
                round.acceptsVotes() && selected == null,
                selected
        );
    }

    private void broadcastStateAfterCommit(UUID sessionId, PollRound round) {
        StateView teacher = stateOf(round, Projection.TEACHER);
        StateView publicView = stateOf(round, Projection.PUBLIC);
        realtimeGateway.broadcastTeachersAfterCommit(sessionId, "POLL_STATE", teacher);
        realtimeGateway.broadcastParticipantsAfterCommit(sessionId, "POLL_STATE", publicView);
        realtimeGateway.broadcastProjectorsAfterCommit(sessionId, "POLL_STATE", publicView);
    }

    private java.util.Optional<PollRound> latestRound(UUID sessionId) {
        return roundRepository.findBySessionIdWithOptions(sessionId).stream().findFirst();
    }

    private PollRound latestOpenRoundForUpdate(UUID sessionId) {
        return roundRepository.findOpenBySessionIdForUpdate(sessionId, OPEN_STATUSES)
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Não há votação aberta nesta sessão."));
    }

    private PollRound lockRound(UUID sessionId, UUID roundId) {
        PollRound round = roundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Votação não encontrada."));
        if (!round.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("A votação não pertence à sessão informada.");
        }
        return round;
    }

    private ClassSession getSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private static void ensureActive(ClassSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
    }

    private static String normalizePrompt(String prompt) {
        String value = prompt == null ? "" : prompt.trim().replaceAll("\\s+", " ");
        if (value.isBlank()) throw new IllegalArgumentException("Informe a pergunta da votação.");
        if (value.length() > MAX_PROMPT_LENGTH) {
            throw new IllegalArgumentException("A pergunta deve ter no máximo 280 caracteres.");
        }
        return value;
    }

    private static List<String> normalizeOptions(List<String> rawOptions) {
        if (rawOptions == null || rawOptions.size() < MIN_OPTIONS || rawOptions.size() > MAX_OPTIONS) {
            throw new IllegalArgumentException("A votação deve ter entre 2 e 6 opções.");
        }
        List<String> options = new ArrayList<>();
        Set<String> normalized = new LinkedHashSet<>();
        for (String raw : rawOptions) {
            String label = raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
            if (label.isBlank()) throw new IllegalArgumentException("Todas as opções precisam de um texto.");
            if (label.length() > MAX_OPTION_LENGTH) {
                throw new IllegalArgumentException("Cada opção deve ter no máximo 160 caracteres.");
            }
            String key = label.toLowerCase(Locale.ROOT);
            if (!normalized.add(key)) throw new IllegalArgumentException("As opções da votação não podem ser repetidas.");
            options.add(label);
        }
        return options;
    }

    private enum Projection {
        TEACHER,
        PUBLIC
    }

    public record CreateCommand(String prompt, List<String> options, boolean liveResults) {}

    public record StateView(RoundView round) {
        public static StateView empty() { return new StateView(null); }
    }

    public record RoundView(
            UUID id,
            UUID sessionId,
            String prompt,
            PollStatus status,
            boolean liveResults,
            boolean publicResultsVisible,
            int totalVotes,
            List<OptionView> options,
            Instant revealedAt,
            Instant closedAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record OptionView(
            UUID id,
            String label,
            int position,
            Integer voteCount,
            Double percentage
    ) {}

    public record ParticipantStateView(UUID roundId, boolean canVote, UUID selectedOptionId) {
        public static ParticipantStateView empty() { return new ParticipantStateView(null, false, null); }
    }
}
