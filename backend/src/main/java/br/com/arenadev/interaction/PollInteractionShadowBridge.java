package br.com.arenadev.interaction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Component
public class PollInteractionShadowBridge {
    private static final Logger log =
            LoggerFactory.getLogger(PollInteractionShadowBridge.class);

    private final PollInteractionShadowService shadowService;
    private final InteractionShadowObservationService observationService;
    private final boolean enabled;

    public PollInteractionShadowBridge(
            PollInteractionShadowService shadowService,
            InteractionShadowObservationService observationService,
            @Value("${app.learning-core.poll-shadow-enabled:false}") boolean enabled
    ) {
        this.shadowService = shadowService;
        this.observationService = observationService;
        this.enabled = enabled;
    }

    public void afterLegacyMutation(UUID pollRoundId) {
        if (!enabled || pollRoundId == null) return;

        Runnable shadowAction = () -> {
            try {
                PollInteractionShadowService.ShadowComparison comparison =
                        shadowService.compare(pollRoundId);
                recordComparison(pollRoundId, comparison);
                if (!comparison.equivalent()) {
                    log.warn(
                            "Poll shadow mismatch. pollRoundId={}, interactionRunId={}, mismatches={}",
                            pollRoundId,
                            comparison.interactionRunId(),
                            comparison.mismatches()
                    );
                } else {
                    log.debug(
                            "Poll shadow equivalent. pollRoundId={}, interactionRunId={}",
                            pollRoundId,
                            comparison.interactionRunId()
                    );
                }
            } catch (RuntimeException error) {
                recordFailure(pollRoundId, error);
                log.warn(
                        "Poll shadow synchronization failed without affecting legacy Poll. pollRoundId={}",
                        pollRoundId,
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
            UUID pollRoundId,
            PollInteractionShadowService.ShadowComparison comparison
    ) {
        try {
            observationService.record(
                    InteractionShadowType.POLL,
                    pollRoundId,
                    comparison.interactionRunId(),
                    comparison.equivalent(),
                    comparison.mismatches(),
                    comparison.legacy().responseCount()
            );
        } catch (RuntimeException error) {
            log.warn(
                    "Poll shadow observation could not be persisted. pollRoundId={}",
                    pollRoundId,
                    error
            );
        }
    }

    private void recordFailure(UUID pollRoundId, RuntimeException shadowError) {
        try {
            observationService.recordFailure(
                    InteractionShadowType.POLL,
                    pollRoundId,
                    shadowError
            );
        } catch (RuntimeException observationError) {
            log.warn(
                    "Poll shadow failure observation could not be persisted. pollRoundId={}",
                    pollRoundId,
                    observationError
            );
        }
    }

    boolean isEnabled() {
        return enabled;
    }
}
