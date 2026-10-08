package br.com.arenadev.interaction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Component
public class WordCloudInteractionShadowBridge {
    private static final Logger log =
            LoggerFactory.getLogger(WordCloudInteractionShadowBridge.class);

    private final WordCloudInteractionShadowService shadowService;
    private final InteractionShadowObservationService observationService;
    private final boolean enabled;

    public WordCloudInteractionShadowBridge(
            WordCloudInteractionShadowService shadowService,
            InteractionShadowObservationService observationService,
            @Value("${app.learning-core.word-cloud-shadow-enabled:false}") boolean enabled
    ) {
        this.shadowService = shadowService;
        this.observationService = observationService;
        this.enabled = enabled;
    }

    public void afterLegacyMutation(UUID roundId) {
        if (!enabled || roundId == null) return;

        Runnable shadowAction = () -> {
            try {
                WordCloudInteractionShadowService.ShadowComparison comparison =
                        shadowService.compare(roundId);
                recordComparison(roundId, comparison);
                if (!comparison.equivalent()) {
                    log.warn(
                            "Word Cloud shadow mismatch. roundId={}, interactionRunId={}, mismatches={}",
                            roundId,
                            comparison.interactionRunId(),
                            comparison.mismatches()
                    );
                } else {
                    log.debug(
                            "Word Cloud shadow equivalent. roundId={}, interactionRunId={}",
                            roundId,
                            comparison.interactionRunId()
                    );
                }
            } catch (RuntimeException error) {
                recordFailure(roundId, error);
                log.warn(
                        "Word Cloud shadow synchronization failed without affecting legacy flow. roundId={}",
                        roundId,
                        error
                );
            }
        };

        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            shadowAction.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        shadowAction.run();
                    }
                }
        );
    }

    private void recordComparison(
            UUID roundId,
            WordCloudInteractionShadowService.ShadowComparison comparison
    ) {
        try {
            observationService.record(
                    InteractionShadowType.WORD_CLOUD,
                    roundId,
                    comparison.interactionRunId(),
                    comparison.equivalent(),
                    comparison.mismatches(),
                    comparison.legacy().participantCount()
            );
        } catch (RuntimeException error) {
            log.warn(
                    "Word Cloud shadow observation could not be persisted. roundId={}",
                    roundId,
                    error
            );
        }
    }

    private void recordFailure(UUID roundId, RuntimeException shadowError) {
        try {
            observationService.recordFailure(
                    InteractionShadowType.WORD_CLOUD,
                    roundId,
                    shadowError
            );
        } catch (RuntimeException observationError) {
            log.warn(
                    "Word Cloud shadow failure observation could not be persisted. roundId={}",
                    roundId,
                    observationError
            );
        }
    }

    boolean isEnabled() {
        return enabled;
    }
}
