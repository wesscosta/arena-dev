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
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
    }

    @Test
    void enabledBridgeRunsComparisonOutsideTransaction() {
        WordCloudInteractionShadowService service =
                mock(WordCloudInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId)).thenReturn(comparison(roundId, true));
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlow() {
        WordCloudInteractionShadowService service =
                mock(WordCloudInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId))
                .thenThrow(new IllegalStateException("shadow failure"));
        WordCloudInteractionShadowBridge bridge =
                new WordCloudInteractionShadowBridge(service, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();
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
