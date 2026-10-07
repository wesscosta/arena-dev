package br.com.arenadev.interaction;

import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.wordcloud.WordCloudRound;
import br.com.arenadev.wordcloud.WordCloudRoundRepository;
import br.com.arenadev.wordcloud.WordCloudStatus;
import br.com.arenadev.wordcloud.WordCloudSubmission;
import br.com.arenadev.wordcloud.WordCloudSubmissionRepository;
import br.com.arenadev.wordcloud.WordCloudTextNormalizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class WordCloudInteractionShadowService {
    private final WordCloudRoundRepository roundRepository;
    private final WordCloudSubmissionRepository submissionRepository;
    private final ClassSessionRepository sessionRepository;
    private final WordCloudInteractionShadowLinkRepository linkRepository;
    private final InteractionDefinitionRepository definitionRepository;
    private final InteractionRunRepository runRepository;
    private final InteractionResponseRepository responseRepository;
    private final InteractionResponseService responseService;
    private final InteractionResultEngine resultEngine;
    private final WordCloudInteractionAdapter adapter;
    private final JsonMapper json;

    public WordCloudInteractionShadowService(
            WordCloudRoundRepository roundRepository,
            WordCloudSubmissionRepository submissionRepository,
            ClassSessionRepository sessionRepository,
            WordCloudInteractionShadowLinkRepository linkRepository,
            InteractionDefinitionRepository definitionRepository,
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            InteractionResponseService responseService,
            InteractionResultEngine resultEngine,
            WordCloudInteractionAdapter adapter,
            JsonMapper json
    ) {
        this.roundRepository = roundRepository;
        this.submissionRepository = submissionRepository;
        this.sessionRepository = sessionRepository;
        this.linkRepository = linkRepository;
        this.definitionRepository = definitionRepository;
        this.runRepository = runRepository;
        this.responseRepository = responseRepository;
        this.responseService = responseService;
        this.resultEngine = resultEngine;
        this.adapter = adapter;
        this.json = json;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ShadowComparison compare(UUID roundId) {
        SyncContext context = syncInternal(roundId);
        InteractionResultEngine.ResultView shadow =
                resultEngine.result(context.link().getRun().getId());

        LegacyResult legacy = legacyResult(context.submissions());
        Map<String, Long> shadowFrequency =
                shadowTermFrequency(context.link().getRun().getId());

        ArrayList<String> mismatches = new ArrayList<>();
        if (legacy.participantCount() != shadow.participation().responseCount()) {
            mismatches.add("participantCount");
        }
        if (legacy.submissionCount() != shadowFrequency.values().stream()
                .mapToLong(Long::longValue)
                .sum()) {
            mismatches.add("submissionCount");
        }
        if (!legacy.termFrequency().equals(shadowFrequency)) {
            mismatches.add("termFrequency");
        }
        if (shadow.evaluation().evaluationCount() != 0
                || shadow.evaluation().accuracy() != null) {
            mismatches.add("unexpectedEvaluation");
        }

        return new ShadowComparison(
                roundId,
                context.link().getRun().getId(),
                mismatches.isEmpty(),
                List.copyOf(mismatches),
                legacy,
                shadowFrequency,
                shadow
        );
    }

    private SyncContext syncInternal(UUID roundId) {
        WordCloudRound round = roundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rodada de Nuvem de Palavras não encontrada."
                ));
        WordCloudInteractionShadowLink link = linkRepository
                .findByRoundIdWithGraph(roundId)
                .orElseGet(() -> createLink(round));

        InteractionRun run = link.getRun();
        List<WordCloudSubmission> submissions =
                submissionRepository.findByRoundIdOrderByCreatedAtAsc(roundId);

        if (run.getStatus() == InteractionRunStatus.CLOSED) {
            return new SyncContext(round, link, submissions);
        }

        if (run.getStatus() == InteractionRunStatus.CREATED) {
            run.open(round.getCreatedAt());
        }

        if (run.acceptsResponses()) {
            syncSubmissions(run, submissions);
        }

        if (round.isLiveReveal() && !run.resultsVisiblePublicly()) {
            run.revealResults(round.getCreatedAt());
        }

        if (round.getStatus() == WordCloudStatus.REVEALED) {
            Instant revealedAt = Objects.requireNonNull(
                    round.getRevealedAt(),
                    "Rodada REVEALED precisa de revealedAt."
            );
            if (run.acceptsResponses()) {
                run.lockResponses(revealedAt);
            }
            if (!run.resultsVisiblePublicly()) {
                run.revealResults(revealedAt);
            }
        }

        if (round.getStatus() == WordCloudStatus.CLOSED) {
            Instant closedAt = Objects.requireNonNull(
                    round.getClosedAt(),
                    "Rodada CLOSED precisa de closedAt."
            );
            if (run.acceptsResponses()) {
                run.lockResponses(closedAt);
            }
            if (!run.resultsVisiblePublicly()) {
                run.revealResults(closedAt);
            }
            run.close(closedAt);
        }

        return new SyncContext(round, link, submissions);
    }

    private WordCloudInteractionShadowLink createLink(WordCloudRound round) {
        ClassSession session = sessionRepository
                .findByIdForUpdate(round.getSession().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão da Nuvem não encontrada."
                ));

        int sequence = runRepository
                .findFirstBySessionIdOrderBySequenceDesc(session.getId())
                .map(previous -> previous.getSequence() + 1)
                .orElse(1);

        InteractionDefinition definition =
                definitionRepository.save(adapter.toDefinition(round));
        InteractionRun run = runRepository.save(
                new InteractionRun(session, definition, sequence)
        );

        return linkRepository.save(
                new WordCloudInteractionShadowLink(round, definition, run)
        );
    }

    private void syncSubmissions(
            InteractionRun run,
            List<WordCloudSubmission> submissions
    ) {
        LinkedHashMap<UUID, List<WordCloudSubmission>> byParticipant =
                new LinkedHashMap<>();

        for (WordCloudSubmission submission : submissions) {
            byParticipant
                    .computeIfAbsent(
                            submission.getParticipant().getId(),
                            ignored -> new ArrayList<>()
                    )
                    .add(submission);
        }

        for (Map.Entry<UUID, List<WordCloudSubmission>> entry :
                byParticipant.entrySet()) {
            responseService.submit(
                    run.getId(),
                    entry.getKey(),
                    adapter.toCanonicalResponse(entry.getValue())
            );
        }
    }

    private LegacyResult legacyResult(List<WordCloudSubmission> submissions) {
        Set<UUID> participants = new LinkedHashSet<>();
        LinkedHashMap<String, Long> frequency = new LinkedHashMap<>();

        for (WordCloudSubmission submission : submissions) {
            participants.add(submission.getParticipant().getId());
            frequency.merge(
                    submission.getNormalizedText(),
                    1L,
                    Long::sum
            );
        }

        return new LegacyResult(
                participants.size(),
                submissions.size(),
                Collections.unmodifiableMap(
                        new LinkedHashMap<>(frequency)
                )
        );
    }

    private Map<String, Long> shadowTermFrequency(UUID runId) {
        LinkedHashMap<String, Long> frequency = new LinkedHashMap<>();
        List<InteractionResponse> responses =
                responseRepository.findByRunIdOrderBySubmittedAtAsc(runId);

        for (InteractionResponse response : responses) {
            for (String text : texts(response.getResponseJson())) {
                String normalized = WordCloudTextNormalizer.normalize(text);
                if (normalized.isBlank()) {
                    throw new IllegalStateException(
                            "Resposta shadow contém texto sem conteúdo normalizável."
                    );
                }
                frequency.merge(normalized, 1L, Long::sum);
            }
        }

        return Collections.unmodifiableMap(new LinkedHashMap<>(frequency));
    }

    private List<String> texts(String responseJson) {
        try {
            Map<String, Object> payload = json.readValue(
                    responseJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            Object raw = payload.get("texts");
            if (!(raw instanceof List<?> list)) {
                throw new IllegalStateException(
                        "Resposta TEXT LIST persistida não possui texts."
                );
            }
            return list.stream()
                    .map(item -> {
                        if (!(item instanceof String text) || text.isBlank()) {
                            throw new IllegalStateException(
                                    "Resposta TEXT LIST persistida possui item inválido."
                            );
                        }
                        return text;
                    })
                    .toList();
        } catch (IllegalStateException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new IllegalStateException(
                    "Resposta TEXT LIST persistida possui JSON inválido."
            );
        }
    }

    private record SyncContext(
            WordCloudRound round,
            WordCloudInteractionShadowLink link,
            List<WordCloudSubmission> submissions
    ) {}

    public record LegacyResult(
            long participantCount,
            long submissionCount,
            Map<String, Long> termFrequency
    ) {}

    public record ShadowComparison(
            UUID wordCloudRoundId,
            UUID interactionRunId,
            boolean equivalent,
            List<String> mismatches,
            LegacyResult legacy,
            Map<String, Long> shadowTermFrequency,
            InteractionResultEngine.ResultView shadow
    ) {
        public ShadowComparison {
            Objects.requireNonNull(mismatches);
            Objects.requireNonNull(shadowTermFrequency);
        }
    }
}
