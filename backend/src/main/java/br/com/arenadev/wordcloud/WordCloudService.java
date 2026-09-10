package br.com.arenadev.wordcloud;

import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.sessionevent.SessionEventActor;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class WordCloudService {
    public static final int MAX_PROMPT_LENGTH = 280;
    public static final int MAX_WORD_LENGTH = 60;
    public static final int MAX_WORDS_PER_PARTICIPANT = 5;

    private static final Set<WordCloudStatus> OPEN_STATUSES = Set.of(
            WordCloudStatus.COLLECTING,
            WordCloudStatus.REVEALED
    );

    private final WordCloudRoundRepository roundRepository;
    private final WordCloudSubmissionRepository submissionRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SessionRealtimeGateway realtimeGateway;
    private final LiveStageService liveStageService;
    private final SessionEventService sessionEventService;

    public WordCloudService(
            WordCloudRoundRepository roundRepository,
            WordCloudSubmissionRepository submissionRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            SessionRealtimeGateway realtimeGateway,
            LiveStageService liveStageService,
            SessionEventService sessionEventService
    ) {
        this.roundRepository = roundRepository;
        this.submissionRepository = submissionRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.realtimeGateway = realtimeGateway;
        this.liveStageService = liveStageService;
        this.sessionEventService = sessionEventService;
    }

    @Transactional
    public StateView create(UUID sessionId, CreateCommand command) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        ensureActive(session);

        String prompt = normalizePrompt(command.prompt());
        validateMaxWords(command.maxWordsPerParticipant());

        List<WordCloudRound> openRounds = roundRepository.findOpenBySessionIdForUpdate(
                sessionId,
                OPEN_STATUSES
        );
        if (openRounds.stream().anyMatch(WordCloudRound::isOpen)) {
            throw new IllegalArgumentException(
                    "Já existe uma rodada de Nuvem de Palavras aberta nesta sessão."
            );
        }

        WordCloudRound round = roundRepository.save(new WordCloudRound(
                session,
                prompt,
                command.liveReveal(),
                command.maxWordsPerParticipant()
        ));

        StateView state = stateOf(round);
        liveStageService.showWordCloud(sessionId, round.getId());
        broadcastStateAfterCommit(sessionId, state);
        sessionEventService.record(
                session,
                SessionEventType.WORD_CLOUD_OPENED,
                SessionEventActor.TEACHER,
                "Nuvem de Palavras aberta: " + prompt,
                Map.of(
                        "roundId", round.getId().toString(),
                        "prompt", prompt,
                        "liveReveal", command.liveReveal(),
                        "maxWordsPerParticipant", command.maxWordsPerParticipant()
                )
        );
        return state;
    }

    @Transactional
    public StateView activatePrepared(UUID sessionId, UUID roundId, CreateCommand command) {
        if (roundId == null) {
            return create(sessionId, command);
        }

        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        ensureActive(session);

        WordCloudRound round = roundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Rodada de Nuvem de Palavras não encontrada."));
        if (!round.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("A rodada de Nuvem de Palavras não pertence a esta sessão.");
        }

        StateView state = stateOf(round);
        liveStageService.showWordCloud(sessionId, round.getId());
        broadcastStateAfterCommit(sessionId, state);
        return state;
    }

    @Transactional(readOnly = true)
    public StateView state(UUID sessionId) {
        getSession(sessionId);
        return roundRepository.findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
                .map(this::stateOf)
                .orElseGet(StateView::empty);
    }

    @Transactional
    public StateView reveal(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        WordCloudRound round = lockRound(sessionId, roundId);
        round.reveal(Instant.now());

        StateView state = stateOf(round);
        broadcastStateAfterCommit(sessionId, state);
        sessionEventService.record(
                session,
                SessionEventType.WORD_CLOUD_REVEALED,
                SessionEventActor.TEACHER,
                "Nuvem de Palavras revelada: " + round.getPrompt(),
                Map.of(
                        "roundId", round.getId().toString(),
                        "prompt", round.getPrompt(),
                        "participantCount", state.round().participantCount(),
                        "submissionCount", state.round().submissionCount()
                )
        );
        return state;
    }

    @Transactional
    public StateView close(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        WordCloudRound round = lockRound(sessionId, roundId);
        boolean wasOpen = round.getStatus() != WordCloudStatus.CLOSED;
        round.close(Instant.now());

        StateView state = stateOf(round);
        broadcastStateAfterCommit(sessionId, state);
        if (wasOpen) {
            sessionEventService.record(
                    session,
                    SessionEventType.WORD_CLOUD_CLOSED,
                    SessionEventActor.TEACHER,
                    "Nuvem de Palavras encerrada com " + state.round().participantCount() + " participante(s).",
                    Map.of(
                            "roundId", round.getId().toString(),
                            "prompt", round.getPrompt(),
                            "participantCount", state.round().participantCount(),
                            "submissionCount", state.round().submissionCount()
                    )
            );
        }
        return state;
    }

    @Transactional
    public ParticipantStateView submit(
            UUID sessionId,
            UUID participantId,
            List<String> rawWords
    ) {
        ensureActive(getSession(sessionId));

        SessionParticipant participant = participantRepository.findByIdAndSessionId(
                        participantId,
                        sessionId
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participante não encontrado nesta sessão."
                ));

        WordCloudRound round = latestOpenRoundForUpdate(sessionId);
        if (round.getStatus() != WordCloudStatus.COLLECTING) {
            throw new IllegalArgumentException(
                    "A coleta desta Nuvem de Palavras já foi encerrada."
            );
        }

        List<WordCloudSubmission> existing = submissionRepository
                .findByRoundIdAndParticipantIdOrderByCreatedAtAsc(
                        round.getId(),
                        participantId
                );

        Map<String, NormalizedWord> requested = normalizeWords(rawWords);
        Set<String> existingNormalized = existing.stream()
                .map(WordCloudSubmission::getNormalizedText)
                .collect(java.util.stream.Collectors.toSet());

        List<NormalizedWord> additions = requested.values().stream()
                .filter(word -> !existingNormalized.contains(word.normalized()))
                .toList();

        int remainingSlots = round.getMaxWordsPerParticipant() - existing.size();
        if (additions.size() > remainingSlots) {
            throw new IllegalArgumentException(
                    "Você pode enviar no máximo "
                            + round.getMaxWordsPerParticipant()
                            + " palavra(s) nesta rodada."
            );
        }

        for (NormalizedWord word : additions) {
            submissionRepository.save(new WordCloudSubmission(
                    round,
                    participant,
                    word.raw(),
                    word.normalized()
            ));
        }

        if (!additions.isEmpty()) {
            StateView state = stateOf(round);
            broadcastStateAfterCommit(sessionId, state);
        }

        return participantStateOf(round, participantId);
    }

    @Transactional(readOnly = true)
    public ParticipantStateView participantState(UUID sessionId, UUID participantId) {
        getSession(sessionId);
        participantRepository.findByIdAndSessionId(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participante não encontrado nesta sessão."
                ));

        return roundRepository.findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
                .map(round -> participantStateOf(round, participantId))
                .orElseGet(ParticipantStateView::empty);
    }

    @Transactional
    public void closeOpenForFinishedSession(UUID sessionId) {
        List<WordCloudRound> openRounds = roundRepository.findOpenBySessionIdForUpdate(
                sessionId,
                OPEN_STATUSES
        );
        if (openRounds.isEmpty()) return;

        Instant now = Instant.now();
        openRounds.forEach(round -> round.close(now));
        StateView state = stateOf(openRounds.getFirst());
        broadcastStateAfterCommit(sessionId, state);
    }

    private StateView stateOf(WordCloudRound round) {
        List<WordCloudSubmission> submissions = submissionRepository
                .findByRoundIdOrderByCreatedAtAsc(round.getId());

        Map<String, Aggregate> aggregates = new LinkedHashMap<>();
        Set<UUID> participantIds = new LinkedHashSet<>();

        for (WordCloudSubmission submission : submissions) {
            participantIds.add(submission.getParticipant().getId());
            aggregates.compute(
                    submission.getNormalizedText(),
                    (key, current) -> current == null
                            ? new Aggregate(submission.getRawText(), 1)
                            : new Aggregate(current.displayText(), current.count() + 1)
            );
        }

        boolean visible = round.isLiveReveal()
                || round.getStatus() != WordCloudStatus.COLLECTING;

        List<TermView> terms = visible
                ? aggregates.entrySet().stream()
                        .map(entry -> new TermView(
                                entry.getValue().displayText(),
                                entry.getKey(),
                                entry.getValue().count()
                        ))
                        .sorted(
                                Comparator.comparingInt(TermView::count)
                                        .reversed()
                                        .thenComparing(TermView::normalizedText)
                        )
                        .toList()
                : List.of();

        return new StateView(new RoundView(
                round.getId(),
                round.getSession().getId(),
                round.getPrompt(),
                round.getStatus(),
                round.isLiveReveal(),
                round.getMaxWordsPerParticipant(),
                participantIds.size(),
                submissions.size(),
                terms,
                round.getRevealedAt(),
                round.getClosedAt(),
                round.getCreatedAt(),
                round.getUpdatedAt()
        ));
    }

    private ParticipantStateView participantStateOf(
            WordCloudRound round,
            UUID participantId
    ) {
        List<String> words = submissionRepository
                .findByRoundIdAndParticipantIdOrderByCreatedAtAsc(
                        round.getId(),
                        participantId
                )
                .stream()
                .map(WordCloudSubmission::getRawText)
                .toList();

        int remaining = Math.max(
                0,
                round.getMaxWordsPerParticipant() - words.size()
        );

        return new ParticipantStateView(
                round.getId(),
                round.getStatus() == WordCloudStatus.COLLECTING && remaining > 0,
                round.getMaxWordsPerParticipant(),
                remaining,
                words
        );
    }

    private WordCloudRound latestOpenRoundForUpdate(UUID sessionId) {
        return roundRepository.findOpenBySessionIdForUpdate(
                        sessionId,
                        OPEN_STATUSES
                )
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Não há Nuvem de Palavras coletando respostas."
                ));
    }

    private WordCloudRound lockRound(UUID sessionId, UUID roundId) {
        WordCloudRound round = roundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rodada de Nuvem de Palavras não encontrada."
                ));
        if (!round.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException(
                    "A rodada não pertence à sessão informada."
            );
        }
        return round;
    }

    private ClassSession getSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão não encontrada."
                ));
    }

    private void broadcastStateAfterCommit(UUID sessionId, StateView state) {
        realtimeGateway.broadcastAfterCommit(
                sessionId,
                "WORD_CLOUD_STATE",
                state
        );
        realtimeGateway.broadcastProjectorsAfterCommit(
                sessionId,
                "WORD_CLOUD_STATE",
                state
        );
    }

    private static void ensureActive(ClassSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
    }

    private static String normalizePrompt(String prompt) {
        String value = prompt == null ? "" : prompt.trim().replaceAll("\\s+", " ");
        if (value.isBlank()) {
            throw new IllegalArgumentException(
                    "Informe a pergunta da Nuvem de Palavras."
            );
        }
        if (value.length() > MAX_PROMPT_LENGTH) {
            throw new IllegalArgumentException(
                    "A pergunta deve ter no máximo 280 caracteres."
            );
        }
        return value;
    }

    private static void validateMaxWords(int maxWords) {
        if (maxWords < 1 || maxWords > MAX_WORDS_PER_PARTICIPANT) {
            throw new IllegalArgumentException(
                    "Cada participante pode enviar entre 1 e 5 palavras."
            );
        }
    }

    private static Map<String, NormalizedWord> normalizeWords(List<String> rawWords) {
        if (rawWords == null || rawWords.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos uma palavra.");
        }

        Map<String, NormalizedWord> normalized = new LinkedHashMap<>();
        for (String rawWord : rawWords) {
            if (rawWord == null) continue;
            String raw = rawWord.trim().replaceAll("\\s+", " ");
            if (raw.isBlank()) continue;
            if (raw.length() > MAX_WORD_LENGTH) {
                throw new IllegalArgumentException(
                        "Cada palavra ou expressão deve ter no máximo 60 caracteres."
                );
            }

            String key = normalizeForFrequency(raw);
            if (key.isBlank()) {
                throw new IllegalArgumentException(
                        "A resposta precisa conter letras ou números."
                );
            }
            normalized.putIfAbsent(key, new NormalizedWord(raw, key));
        }

        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos uma palavra.");
        }
        return normalized;
    }

    static String normalizeForFrequency(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\s-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public record CreateCommand(
            String prompt,
            boolean liveReveal,
            int maxWordsPerParticipant
    ) {
    }

    public record StateView(RoundView round) {
        public static StateView empty() {
            return new StateView(null);
        }
    }

    public record RoundView(
            UUID id,
            UUID sessionId,
            String prompt,
            WordCloudStatus status,
            boolean liveReveal,
            int maxWordsPerParticipant,
            int participantCount,
            int submissionCount,
            List<TermView> terms,
            Instant revealedAt,
            Instant closedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record TermView(
            String text,
            String normalizedText,
            int count
    ) {
    }

    public record ParticipantStateView(
            UUID roundId,
            boolean canSubmit,
            int maxWords,
            int remainingWords,
            List<String> submittedWords
    ) {
        public static ParticipantStateView empty() {
            return new ParticipantStateView(
                    null,
                    false,
                    0,
                    0,
                    List.of()
            );
        }
    }

    private record Aggregate(String displayText, int count) {
    }

    private record NormalizedWord(String raw, String normalized) {
    }
}
