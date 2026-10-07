package br.com.arenadev.interaction;

import br.com.arenadev.learning.ContentRef;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InteractionDefinitionTest {
    @Test
    void choiceUsesStableLogicalOptionKeysAndCanBeActivated() {
        InteractionDefinition definition = new InteractionDefinition(
                "Qual JOIN mantém todas as linhas da tabela esquerda?",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                new ContentRef("LEARNING_RESOURCE", "resource-1", 2, "left-join"),
                new Provenance(ProvenanceOrigin.TEACHER, null, null, null, Instant.parse("2026-10-07T02:00:00Z"))
        );

        definition.addOption("A", "INNER JOIN", 0, null);
        definition.addOption("B", "LEFT JOIN", 1, null);
        definition.configureEvaluation("{\"correctOptionKeys\":[\"B\"]}");
        definition.activate();

        assertThat(definition.getStatus()).isEqualTo(InteractionDefinitionStatus.ACTIVE);
        assertThat(definition.getOptions()).extracting(InteractionOption::getOptionKey)
                .containsExactly("A", "B");
        assertThat(definition.contentRef().sourceVersion()).isEqualTo(2);
    }

    @Test
    void textCanUseWordCloudButChoiceCannot() {
        InteractionDefinition text = definition(
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.WORD_CLOUD
        );

        assertThat(text.getPresentationMode()).isEqualTo(InteractionPresentationMode.WORD_CLOUD);

        assertThatThrownBy(() -> definition(
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.WORD_CLOUD
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("TEXT");
    }

    @Test
    void textRejectsOptionsAndChoiceRejectsDuplicateLogicalKeysOrPositions() {
        InteractionDefinition text = definition(
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT
        );
        assertThatThrownBy(() -> text.addOption("A", "x", 0, null))
                .isInstanceOf(IllegalArgumentException.class);

        InteractionDefinition choice = definition(
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT
        );
        choice.addOption("A", "Primeira", 0, null);

        assertThatThrownBy(() -> choice.addOption("A", "Duplicada", 1, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chave");

        assertThatThrownBy(() -> choice.addOption("B", "Outra", 0, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("posição");
    }

    @Test
    void choiceCannotBeActivatedWithoutOptions() {
        InteractionDefinition choice = definition(
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT
        );

        assertThatThrownBy(choice::activate)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("alternativas");
    }

    private static InteractionDefinition definition(
            InteractionResponseKind responseKind,
            InteractionEvaluationMode evaluationMode,
            InteractionPresentationMode presentationMode
    ) {
        return new InteractionDefinition(
                "Prompt",
                responseKind,
                evaluationMode,
                presentationMode,
                null,
                false,
                null,
                new Provenance(ProvenanceOrigin.SYSTEM, null, null, null, Instant.parse("2026-10-07T02:00:00Z"))
        );
    }
}
