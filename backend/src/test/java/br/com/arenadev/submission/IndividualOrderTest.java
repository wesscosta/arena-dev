package br.com.arenadev.submission;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class IndividualOrderTest {
    private static final List<String> OPTIONS = List.of("A", "B", "C", "D");
    private static final UUID QUESTION = UUID.fromString("6a1f6d3e-2c4b-4f0a-9d1e-3b7c5a2e8f10");
    private static final UUID FIRST_ATTEMPT = UUID.fromString("0f4b1c2d-3e5f-4a6b-8c7d-9e0f1a2b3c4d");
    private static final UUID SECOND_ATTEMPT = UUID.fromString("7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f");

    @Test
    void sameSeedAlwaysGivesTheSameOrder() {
        long seed = IndividualOrder.optionSeed(FIRST_ATTEMPT, QUESTION);

        assertThat(IndividualOrder.shuffle(OPTIONS, seed)).isEqualTo(IndividualOrder.shuffle(OPTIONS, seed));
        assertThat(IndividualOrder.optionSeed(FIRST_ATTEMPT, QUESTION)).isEqualTo(seed);
    }

    @Test
    void differentAttemptsGetDifferentOrdersWithFixedSeeds() {
        List<String> first = IndividualOrder.shuffle(OPTIONS, IndividualOrder.optionSeed(FIRST_ATTEMPT, QUESTION));
        List<String> second = IndividualOrder.shuffle(OPTIONS, IndividualOrder.optionSeed(SECOND_ATTEMPT, QUESTION));

        assertThat(first).isNotEqualTo(second);
        assertThat(IndividualOrder.questionSeed(FIRST_ATTEMPT)).isNotEqualTo(IndividualOrder.questionSeed(SECOND_ATTEMPT));
    }

    @Test
    void shuffleIsAPermutationAndKeepsTheInputIntact() {
        List<Integer> items = List.of(1, 2, 3, 4, 5, 6, 7, 8);

        List<Integer> shuffled = IndividualOrder.shuffle(items, IndividualOrder.questionSeed(FIRST_ATTEMPT));

        assertThat(shuffled).containsExactlyInAnyOrderElementsOf(items).isNotEqualTo(items);
        assertThat(items).containsExactly(1, 2, 3, 4, 5, 6, 7, 8);
    }
}
