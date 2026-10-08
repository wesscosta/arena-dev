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
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        PollInteractionShadowBridge bridge =
                new PollInteractionShadowBridge(service, observations, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
    }

    @Test
    void enabledBridgeRunsComparisonAndPersistsEvidenceOutsideTransaction() {
        PollInteractionShadowService service = mock(PollInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        PollInteractionShadowService.ShadowComparison comparison =
                comparison(roundId, true);
        when(service.compare(roundId)).thenReturn(comparison);
        PollInteractionShadowBridge bridge =
                new PollInteractionShadowBridge(service, observations, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
        verify(observations).record(
                InteractionShadowType.POLL,
                roundId,
                comparison.interactionRunId(),
                true,
                List.of(),
                0
        );
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlowAndIsRecorded() {
        PollInteractionShadowService service = mock(PollInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        IllegalStateException error = new IllegalStateException("shadow failure");
        when(service.compare(roundId)).thenThrow(error);
        PollInteractionShadowBridge bridge =
                new PollInteractionShadowBridge(service, observations, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();

        verify(observations).recordFailure(InteractionShadowType.POLL, roundId, error);
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
