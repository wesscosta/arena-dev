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
    private final boolean enabled;

    public WordCloudInteractionShadowBridge(
            WordCloudInteractionShadowService shadowService,
            @Value("${app.learning-core.word-cloud-shadow-enabled:false}") boolean enabled
    ) {
        this.shadowService = shadowService;
        this.enabled = enabled;
    }

    public void afterLegacyMutation(UUID roundId) {
        if (!enabled || roundId == null) return;

        Runnable shadowAction = () -> {
            try {
                WordCloudInteractionShadowService.ShadowComparison comparison =
                        shadowService.compare(roundId);
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

    boolean isEnabled() {
        return enabled;
    }
}
