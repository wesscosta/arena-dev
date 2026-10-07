package br.com.arenadev.interaction;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.QuestionType;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QuizInteractionAdapterTest {
    private final QuizInteractionAdapter adapter =
            new QuizInteractionAdapter(JsonMapper.builder().build());

    @Test
    void mapsMultipleChoiceWithoutCouplingDefinitionToActivityQuestion() {
        UUID questionId = UUID.randomUUID();
        ActivityQuestion question = mock(ActivityQuestion.class);
        when(question.getId()).thenReturn(questionId);
        when(question.getType()).thenReturn(QuestionType.MULTIPLE_CHOICE);
        when(question.getStatement()).thenReturn("Qual alternativa?");
        when(question.getOptionsJson()).thenReturn("""
                [
                  {"id":"a","text":"Alternativa A"},
                  {"id":"b","text":"Alternativa B"}
                ]
                """);
        when(question.getAnswerJson()).thenReturn("\"b\"");

        InteractionDefinition definition = adapter.toDefinition(question);

        assertThat(definition.getResponseKind()).isEqualTo(InteractionResponseKind.CHOICE);
        assertThat(definition.getEvaluationMode())
                .isEqualTo(InteractionEvaluationMode.CORRECT_ANSWER);
        assertThat(definition.getSubmissionPolicy())
                .isEqualTo(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        assertThat(definition.isProducesEvidence()).isFalse();
        assertThat(definition.getLearningTarget()).isNull();
        assertThat(definition.provenance().sourceRef())
                .isEqualTo("activity-question:" + questionId);
        assertThat(definition.getOptions())
                .extracting(InteractionOption::getOptionKey)
                .containsExactly("a", "b");
        assertThat(definition.getEvaluationConfigJson()).contains("\"b\"");
        assertThat(adapter.toCanonicalResponse(question, "\"a\""))
                .isEqualTo("{\"selectedOptionKeys\":[\"a\"]}");
    }

    @Test
    void mapsTrueFalseToChoiceKeysWithoutAuthoringOptions() {
        ActivityQuestion question = mock(ActivityQuestion.class);
        when(question.getId()).thenReturn(UUID.randomUUID());
        when(question.getType()).thenReturn(QuestionType.TRUE_FALSE);
        when(question.getStatement()).thenReturn("Verdadeiro ou falso?");
        when(question.getAnswerJson()).thenReturn("true");

        InteractionDefinition definition = adapter.toDefinition(question);

        assertThat(definition.getOptions())
                .extracting(InteractionOption::getOptionKey)
                .containsExactly("true", "false");
        assertThat(adapter.correctOptionKey(question)).isEqualTo("true");
        assertThat(adapter.toCanonicalResponse(question, "false"))
                .isEqualTo("{\"selectedOptionKeys\":[\"false\"]}");
    }
}
