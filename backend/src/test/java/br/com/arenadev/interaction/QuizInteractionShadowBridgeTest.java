package br.com.arenadev.interaction;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QuizInteractionShadowBridgeTest {
    @Test
    void disabledBridgeDoesNothing() {
        QuizInteractionShadowService service = mock(QuizInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        QuizInteractionShadowBridge bridge =
                new QuizInteractionShadowBridge(service, observations, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
        verify(observations, never()).recordFailure(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void enabledBridgeRunsComparisonAndPersistsEvidenceOutsideTransaction() {
        QuizInteractionShadowService service = mock(QuizInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        QuizInteractionShadowService.ShadowComparison comparison =
                comparison(roundId, true);
        when(service.compare(roundId)).thenReturn(comparison);
        QuizInteractionShadowBridge bridge =
                new QuizInteractionShadowBridge(service, observations, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
        verify(observations).record(
                InteractionShadowType.QUIZ,
                roundId,
                comparison.interactionRunId(),
                true,
                List.of(),
                0
        );
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlowAndIsRecorded() {
        QuizInteractionShadowService service = mock(QuizInteractionShadowService.class);
        InteractionShadowObservationService observations =
                mock(InteractionShadowObservationService.class);
        UUID roundId = UUID.randomUUID();
        IllegalStateException error = new IllegalStateException("shadow failure");
        when(service.compare(roundId)).thenThrow(error);
        QuizInteractionShadowBridge bridge =
                new QuizInteractionShadowBridge(service, observations, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();

        verify(observations).recordFailure(InteractionShadowType.QUIZ, roundId, error);
    }

    private static QuizInteractionShadowService.ShadowComparison comparison(
            UUID roundId,
            boolean equivalent
    ) {
        return new QuizInteractionShadowService.ShadowComparison(
                roundId,
                UUID.randomUUID(),
                equivalent,
                equivalent ? List.of() : List.of("distribution"),
                new QuizInteractionShadowService.LegacyResult(0, java.util.Map.of(), 0, 0),
                null
        );
    }
}
