package br.com.arenadev.interaction;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WordCloudInteractionShadowBridgeTest {
    @Test
    void disabledBridgeDoesNothing() {
        WordCloudInteractionShadowService service =
                mock(WordCloudInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, observations, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
    }

    @Test
    void enabledBridgeRunsComparisonAndPersistsEvidenceOutsideTransaction() {
        WordCloudInteractionShadowService service =
                mock(WordCloudInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        WordCloudInteractionShadowService.ShadowComparison comparison =
                comparison(roundId, true);
        when(service.compare(roundId)).thenReturn(comparison);
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, observations, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
        verify(observations).record(
                InteractionShadowType.WORD_CLOUD,
                roundId,
                comparison.interactionRunId(),
                true,
                List.of(),
                0
        );
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlowAndIsRecorded() {
        WordCloudInteractionShadowService service =
                mock(WordCloudInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        IllegalStateException error = new IllegalStateException("shadow failure");
        when(service.compare(roundId)).thenThrow(error);
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, observations, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();

        verify(observations).recordFailure(
                InteractionShadowType.WORD_CLOUD,
                roundId,
                error
        );
    }

    private static WordCloudInteractionShadowService.ShadowComparison comparison(
            UUID roundId,
            boolean equivalent
    ) {
        Map<String, Long> frequency = Map.of();
        return new WordCloudInteractionShadowService.ShadowComparison(
                roundId,
                UUID.randomUUID(),
                equivalent,
                equivalent ? List.of() : List.of("termFrequency"),
                new WordCloudInteractionShadowService.LegacyResult(
                        0,
                        0,
                        frequency
                ),
                frequency,
                null
        );
    }
}
