package br.com.arenadev.interaction;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PollInteractionShadowBridgeTest {
    @Test
    void disabledBridgeDoesNothing() {
        PollInteractionShadowService service = mock(PollInteractionShadowService.class);
        PollInteractionShadowBridge bridge = new PollInteractionShadowBridge(service, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
    }

    @Test
    void enabledBridgeRunsComparisonOutsideTransaction() {
        PollInteractionShadowService service = mock(PollInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId)).thenReturn(comparison(roundId, true));
        PollInteractionShadowBridge bridge = new PollInteractionShadowBridge(service, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlow() {
        PollInteractionShadowService service = mock(PollInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId)).thenThrow(new IllegalStateException("shadow failure"));
        PollInteractionShadowBridge bridge = new PollInteractionShadowBridge(service, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();
    }

    private static PollInteractionShadowService.ShadowComparison comparison(
            UUID roundId,
            boolean equivalent
    ) {
        return new PollInteractionShadowService.ShadowComparison(
                roundId,
                UUID.randomUUID(),
                equivalent,
                equivalent ? List.of() : List.of("distribution"),
                new PollInteractionShadowService.LegacyResult(0, java.util.Map.of()),
                null
        );
    }
}
