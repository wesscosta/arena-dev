package br.com.arenadev.interaction;

import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InteractionResponseValidatorTest {
    private final InteractionResponseValidator validator =
            new InteractionResponseValidator(JsonMapper.builder().build());

    @Test
    void validatesChoiceKeysAndSelectionLimits() {
        InteractionDefinition definition = choice();
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":2}");

        assertThatCode(() -> validator.validate(
                definition,
                "{\"selectedOptionKeys\":[\"A\",\"B\"]}"
        )).doesNotThrowAnyException();

        assertThatThrownBy(() -> validator.validate(
                definition,
                "{\"selectedOptionKeys\":[\"X\"]}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inexistente");

        assertThatThrownBy(() -> validator.validate(
                definition,
                "{\"selectedOptionKeys\":[]}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantidade");
    }

    @Test
    void validatesTextPayload() {
        InteractionDefinition definition = new InteractionDefinition(
                "Explique",
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                provenance()
        );

        assertThatCode(() -> validator.validate(
                definition,
                "{\"text\":\"Minha resposta\"}"
        )).doesNotThrowAnyException();

        assertThatThrownBy(() -> validator.validate(
                definition,
                "{\"text\":\" \"}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não vazio");
    }

    @Test
    void validatesTextListPayloadForWordCloudLikeInteractions() {
        InteractionDefinition definition = new InteractionDefinition(
                "Liste conceitos",
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.WORD_CLOUD,
                null,
                false,
                null,
                provenance()
        );
        definition.configureResponse(
                "{\"mode\":\"LIST\",\"minItems\":1,\"maxItems\":3,\"maxItemLength\":10}"
        );

        assertThatCode(() -> validator.validate(
                definition,
                "{\"texts\":[\"Java\",\"SQL\"]}"
        )).doesNotThrowAnyException();

        assertThatThrownBy(() -> validator.validate(
                definition,
                "{\"texts\":[\"Java\",\"SQL\",\"Docker\",\"Git\"]}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantidade");

        assertThatThrownBy(() -> validator.validate(
                definition,
                "{\"texts\":[\"texto muito longo\"]}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limite");
    }

    private static InteractionDefinition choice() {
        InteractionDefinition definition = new InteractionDefinition(
                "Escolha",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                provenance()
        );
        definition.addOption("A", "A", 0, null);
        definition.addOption("B", "B", 1, null);
        definition.addOption("C", "C", 2, null);
        definition.activate();
        return definition;
    }

    private static Provenance provenance() {
        return new Provenance(
                ProvenanceOrigin.SYSTEM,
                null,
                null,
                null,
                Instant.parse("2026-10-07T02:00:00Z")
        );
    }
}
