package br.com.arenadev.interaction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Component
public class QuizInteractionShadowBridge {
    private static final Logger log = LoggerFactory.getLogger(QuizInteractionShadowBridge.class);

    private final QuizInteractionShadowService shadowService;
    private final InteractionShadowObservationService observationService;
    private final boolean enabled;

    public QuizInteractionShadowBridge(
            QuizInteractionShadowService shadowService,
            InteractionShadowObservationService observationService,
            @Value("${app.learning-core.quiz-shadow-enabled:false}") boolean enabled
    ) {
        this.shadowService = shadowService;
        this.observationService = observationService;
        this.enabled = enabled;
    }

    public void afterLegacyMutation(UUID quizRoundId) {
        if (!enabled || quizRoundId == null) return;

        Runnable shadowAction = () -> {
            try {
                QuizInteractionShadowService.ShadowComparison comparison =
                        shadowService.compare(quizRoundId);
                recordComparison(quizRoundId, comparison);
                if (!comparison.equivalent()) {
                    log.warn(
                            "Quiz shadow mismatch. quizRoundId={}, interactionRunId={}, mismatches={}",
                            quizRoundId,
                            comparison.interactionRunId(),
                            comparison.mismatches()
                    );
                } else {
                    log.debug(
                            "Quiz shadow equivalent. quizRoundId={}, interactionRunId={}",
                            quizRoundId,
                            comparison.interactionRunId()
                    );
                }
            } catch (RuntimeException error) {
                recordFailure(quizRoundId, error);
                log.warn(
                        "Quiz shadow synchronization failed without affecting legacy Quiz. quizRoundId={}",
                        quizRoundId,
                        error
                );
            }
        };

        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            shadowAction.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                shadowAction.run();
            }
        });
    }

    private void recordComparison(
            UUID quizRoundId,
            QuizInteractionShadowService.ShadowComparison comparison
    ) {
        try {
            observationService.record(
                    InteractionShadowType.QUIZ,
                    quizRoundId,
                    comparison.interactionRunId(),
                    comparison.equivalent(),
                    comparison.mismatches(),
                    comparison.legacy().responseCount()
            );
        } catch (RuntimeException error) {
            log.warn(
                    "Quiz shadow observation could not be persisted. quizRoundId={}",
                    quizRoundId,
                    error
            );
        }
    }

    private void recordFailure(UUID quizRoundId, RuntimeException shadowError) {
        try {
            observationService.recordFailure(
                    InteractionShadowType.QUIZ,
                    quizRoundId,
                    shadowError
            );
        } catch (RuntimeException observationError) {
            log.warn(
                    "Quiz shadow failure observation could not be persisted. quizRoundId={}",
                    quizRoundId,
                    observationError
            );
        }
    }

    boolean isEnabled() {
        return enabled;
    }
}
