package br.com.arenadev.interaction;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.quiz.ParticipantAnswer;
import br.com.arenadev.quiz.ParticipantAnswerRepository;
import br.com.arenadev.quiz.QuizRound;
import br.com.arenadev.quiz.QuizRoundRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class QuizInteractionShadowService {
    private final QuizRoundRepository quizRoundRepository;
    private final ParticipantAnswerRepository legacyAnswerRepository;
    private final ClassSessionRepository sessionRepository;
    private final QuizInteractionShadowLinkRepository linkRepository;
    private final InteractionDefinitionRepository definitionRepository;
    private final InteractionRunRepository runRepository;
    private final InteractionResponseService responseService;
    private final InteractionEvaluationService evaluationService;
    private final InteractionResultEngine resultEngine;
    private final QuizInteractionAdapter adapter;

    public QuizInteractionShadowService(
            QuizRoundRepository quizRoundRepository,
            ParticipantAnswerRepository legacyAnswerRepository,
            ClassSessionRepository sessionRepository,
            QuizInteractionShadowLinkRepository linkRepository,
            InteractionDefinitionRepository definitionRepository,
            InteractionRunRepository runRepository,
            InteractionResponseService responseService,
            InteractionEvaluationService evaluationService,
            InteractionResultEngine resultEngine,
            QuizInteractionAdapter adapter
    ) {
        this.quizRoundRepository = quizRoundRepository;
        this.legacyAnswerRepository = legacyAnswerRepository;
        this.sessionRepository = sessionRepository;
        this.linkRepository = linkRepository;
        this.definitionRepository = definitionRepository;
        this.runRepository = runRepository;
        this.responseService = responseService;
        this.evaluationService = evaluationService;
        this.resultEngine = resultEngine;
        this.adapter = adapter;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ShadowState sync(UUID quizRoundId) {
        SyncContext context = syncInternal(quizRoundId);
        return state(context);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ShadowComparison compare(UUID quizRoundId) {
        SyncContext context = syncInternal(quizRoundId);
        InteractionResultEngine.ResultView shadow = resultEngine.result(context.link().getRun().getId());
        LegacyResult legacy = legacyResult(context.round(), context.answers(), context.link().getDefinition());

        ArrayList<String> mismatches = new ArrayList<>();
        if (legacy.responseCount() != shadow.participation().responseCount()) {
            mismatches.add("responseCount");
        }
        if (!legacy.distribution().equals(shadow.choiceDistribution())) {
            mismatches.add("distribution");
        }
        if (legacy.evaluatedCount() != shadow.evaluation().evaluationCount()) {
            mismatches.add("evaluatedCount");
        }
        if (legacy.correctCount() != shadow.evaluation().correctCount()) {
            mismatches.add("correctCount");
        }

        return new ShadowComparison(
                quizRoundId,
                context.link().getRun().getId(),
                mismatches.isEmpty(),
                List.copyOf(mismatches),
                legacy,
                shadow
        );
    }

    private SyncContext syncInternal(UUID quizRoundId) {
        QuizRound round = quizRoundRepository.findByIdForUpdate(quizRoundId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz não encontrado."));

        QuizInteractionShadowLink link = linkRepository
                .findByQuizRoundIdWithGraph(quizRoundId)
                .orElseGet(() -> createLink(round));

        InteractionRun run = link.getRun();
        List<ParticipantAnswer> answers =
                legacyAnswerRepository.findByRoundIdOrderBySubmittedAtAsc(quizRoundId);

        if (run.getStatus() == InteractionRunStatus.CLOSED) {
            return new SyncContext(round, link, answers);
        }

        if (round.getOpenedAt() == null) {
            if (round.getClosedAt() != null && run.getStatus() == InteractionRunStatus.CREATED) {
                run.discard(round.getClosedAt());
            }
            return new SyncContext(round, link, answers);
        }

        if (run.getStatus() == InteractionRunStatus.CREATED) {
            run.open(round.getOpenedAt());
        }

        if (run.acceptsResponses()) {
            syncAnswers(round.getQuestion(), run, answers);
        }

        if (round.getLockedAt() != null && run.getResponsesLockedAt() == null) {
            run.lockResponses(round.getLockedAt());
        }

        if (round.getLockedAt() != null) {
            evaluationService.evaluateRun(run.getId());
        }

        if (round.getRevealedAt() != null && !run.resultsVisiblePublicly()) {
            run.revealResults(round.getRevealedAt());
        }

        if (round.getClosedAt() != null && run.getStatus() != InteractionRunStatus.CLOSED) {
            run.close(round.getClosedAt());
        }

        return new SyncContext(round, link, answers);
    }

    private QuizInteractionShadowLink createLink(QuizRound round) {
        ClassSession session = sessionRepository.findByIdForUpdate(round.getSession().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Sessão do Quiz não encontrada."));

        int sequence = runRepository.findFirstBySessionIdOrderBySequenceDesc(session.getId())
                .map(previous -> previous.getSequence() + 1)
                .orElse(1);

        InteractionDefinition definition =
                definitionRepository.save(adapter.toDefinition(round.getQuestion()));
        InteractionRun run = runRepository.save(
                new InteractionRun(session, definition, sequence)
        );
        return linkRepository.save(new QuizInteractionShadowLink(round, definition, run));
    }

    private void syncAnswers(
            ActivityQuestion question,
            InteractionRun run,
            List<ParticipantAnswer> answers
    ) {
        for (ParticipantAnswer answer : answers) {
            responseService.submit(
                    run.getId(),
                    answer.getParticipant().getId(),
                    adapter.toCanonicalResponse(question, answer.getAnswerJson())
            );
        }
    }

    private LegacyResult legacyResult(
            QuizRound round,
            List<ParticipantAnswer> answers,
            InteractionDefinition definition
    ) {
        LinkedHashMap<String, Long> distribution = new LinkedHashMap<>();
        for (InteractionOption option : definition.getOptions()) {
            distribution.put(option.getOptionKey(), 0L);
        }

        long evaluated = 0;
        long correct = 0;

        for (ParticipantAnswer answer : answers) {
            String key = adapter.answerOptionKey(round.getQuestion(), answer.getAnswerJson());
            if (!distribution.containsKey(key)) {
                throw new IllegalStateException(
                        "Resposta legada contém alternativa fora da definição shadow."
                );
            }
            distribution.computeIfPresent(key, (ignored, current) -> current + 1);

            if (answer.isEvaluated()) {
                evaluated += 1;
                if (Boolean.TRUE.equals(answer.isCorrect())) {
                    correct += 1;
                }
            }
        }

        return new LegacyResult(
                answers.size(),
                Collections.unmodifiableMap(new LinkedHashMap<>(distribution)),
                evaluated,
                correct
        );
    }

    private ShadowState state(SyncContext context) {
        InteractionRun run = context.link().getRun();
        return new ShadowState(
                context.round().getId(),
                context.link().getDefinition().getId(),
                run.getId(),
                run.getStatus(),
                run.acceptsResponses(),
                run.resultsVisiblePublicly(),
                context.answers().size()
        );
    }

    private record SyncContext(
            QuizRound round,
            QuizInteractionShadowLink link,
            List<ParticipantAnswer> answers
    ) {
    }

    public record ShadowState(
            UUID quizRoundId,
            UUID interactionDefinitionId,
            UUID interactionRunId,
            InteractionRunStatus status,
            boolean acceptsResponses,
            boolean resultsVisiblePublicly,
            int legacyResponseCount
    ) {
    }

    public record LegacyResult(
            long responseCount,
            Map<String, Long> distribution,
            long evaluatedCount,
            long correctCount
    ) {
    }

    public record ShadowComparison(
            UUID quizRoundId,
            UUID interactionRunId,
            boolean equivalent,
            List<String> mismatches,
            LegacyResult legacy,
            InteractionResultEngine.ResultView shadow
    ) {
        public ShadowComparison {
            Objects.requireNonNull(mismatches);
        }
    }
}
