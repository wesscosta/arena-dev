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
        QuizInteractionShadowBridge bridge = new QuizInteractionShadowBridge(service, false);
        UUID roundId = UUID.randomUUID();

        bridge.afterLegacyMutation(roundId);

        verify(service, never()).compare(roundId);
    }

    @Test
    void enabledBridgeRunsComparisonOutsideTransaction() {
        QuizInteractionShadowService service = mock(QuizInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId)).thenReturn(comparison(roundId, true));
        QuizInteractionShadowBridge bridge = new QuizInteractionShadowBridge(service, true);

        bridge.afterLegacyMutation(roundId);

        verify(service).compare(roundId);
    }

    @Test
    void shadowFailureNeverEscapesIntoLegacyFlow() {
        QuizInteractionShadowService service = mock(QuizInteractionShadowService.class);
        UUID roundId = UUID.randomUUID();
        when(service.compare(roundId)).thenThrow(new IllegalStateException("shadow failure"));
        QuizInteractionShadowBridge bridge = new QuizInteractionShadowBridge(service, true);

        assertThatCode(() -> bridge.afterLegacyMutation(roundId))
                .doesNotThrowAnyException();
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
