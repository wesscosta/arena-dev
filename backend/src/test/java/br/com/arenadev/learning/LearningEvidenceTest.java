package br.com.arenadev.learning;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LearningEvidenceTest {
    @Test
    void rejectsScoreOrConfidenceOutsideProbabilityRange() {
        assertThatThrownBy(() -> probability(new BigDecimal("1.01")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("score");
    }

    private static BigDecimal probability(BigDecimal value) {
        if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("score deve estar entre 0 e 1.");
        }
        return value;
    }
}
