package br.com.arenadev.interaction;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InteractionCutoverGateServiceTest {
    @Test
    void blocksCutoverWhenShadowsAreDisabled() {
        InteractionShadowObservationRepository repository =
                mock(InteractionShadowObservationRepository.class);
        when(repository.findByInteractionTypeOrderByObservedAtDesc(
                any(InteractionShadowType.class),
                any(Pageable.class)
        )).thenReturn(List.of());

        InteractionCutoverGateService service =
                new InteractionCutoverGateService(
                        repository,
                        false,
                        false,
                        false,
                        1,
                        20
                );

        InteractionCutoverGateService.GateReport report = service.report();

        assertThat(report.logicalCutoverReady()).isFalse();
        assertThat(report.physicalLegacyRemovalReady()).isFalse();
        assertThat(report.types().values())
                .allMatch(type -> !type.readyForCutover());
    }

    @Test
    void approvesLogicalCutoverOnlyAfterTerminalEquivalentEvidenceForEveryType() {
        InteractionShadowObservationRepository repository =
                mock(InteractionShadowObservationRepository.class);

        for (InteractionShadowType type : InteractionShadowType.values()) {
            UUID roundId = UUID.randomUUID();
            when(repository.findByInteractionTypeOrderByObservedAtDesc(
                    eq(type),
                    any(Pageable.class)
            )).thenReturn(List.of(observation(
                    type,
                    roundId,
                    InteractionShadowObservationStatus.EQUIVALENT,
                    InteractionRunStatus.CLOSED
            )));
        }

        InteractionCutoverGateService service =
                new InteractionCutoverGateService(
                        repository,
                        true,
                        true,
                        true,
                        1,
                        20
                );

        InteractionCutoverGateService.GateReport report = service.report();

        assertThat(report.logicalCutoverReady()).isTrue();
        assertThat(report.physicalLegacyRemovalReady()).isFalse();
        assertThat(report.types().values())
                .allMatch(InteractionCutoverGateService.TypeGate::readyForCutover);
        assertThat(report.legacyRemovalBlockers())
                .anyMatch(value -> value.contains("rollback"));
    }

    @Test
    void latestMismatchBlocksCutoverEvenWhenOlderObservationWasEquivalent() {
        InteractionShadowObservationRepository repository =
                mock(InteractionShadowObservationRepository.class);

        UUID quizRoundId = UUID.randomUUID();
        when(repository.findByInteractionTypeOrderByObservedAtDesc(
                eq(InteractionShadowType.QUIZ),
                any(Pageable.class)
        )).thenReturn(List.of(
                observation(
                        InteractionShadowType.QUIZ,
                        quizRoundId,
                        InteractionShadowObservationStatus.MISMATCH,
                        InteractionRunStatus.CLOSED
                ),
                observation(
                        InteractionShadowType.QUIZ,
                        quizRoundId,
                        InteractionShadowObservationStatus.EQUIVALENT,
                        InteractionRunStatus.CLOSED
                )
        ));

        for (InteractionShadowType type : List.of(
                InteractionShadowType.POLL,
                InteractionShadowType.WORD_CLOUD
        )) {
            when(repository.findByInteractionTypeOrderByObservedAtDesc(
                    eq(type),
                    any(Pageable.class)
            )).thenReturn(List.of(observation(
                    type,
                    UUID.randomUUID(),
                    InteractionShadowObservationStatus.EQUIVALENT,
                    InteractionRunStatus.CLOSED
            )));
        }

        InteractionCutoverGateService service =
                new InteractionCutoverGateService(
                        repository,
                        true,
                        true,
                        true,
                        1,
                        20
                );

        InteractionCutoverGateService.GateReport report = service.report();

        assertThat(report.logicalCutoverReady()).isFalse();
        assertThat(report.types().get(InteractionShadowType.QUIZ).unresolvedRounds())
                .containsExactly(quizRoundId);
    }

    private static InteractionShadowObservation observation(
            InteractionShadowType type,
            UUID roundId,
            InteractionShadowObservationStatus status,
            InteractionRunStatus runStatus
    ) {
        return new InteractionShadowObservation(
                type,
                roundId,
                UUID.randomUUID(),
                runStatus,
                status,
                status == InteractionShadowObservationStatus.EQUIVALENT
                        ? "[]"
                        : "[\"distribution\"]",
                2L,
                Instant.now()
        );
    }
}
