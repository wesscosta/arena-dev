package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.SessionParticipant;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeterministicInteractionEvaluatorTest {
    private final DeterministicInteractionEvaluator evaluator =
            new DeterministicInteractionEvaluator(JsonMapper.builder().build());

    @Test
    void evaluatesChoiceByStableOptionKeys() {
        InteractionDefinition definition = definition();
        InteractionResponse correct = response(definition, "{\"selectedOptionKeys\":[\"B\"]}");
        InteractionResponse incorrect = response(definition, "{\"selectedOptionKeys\":[\"A\"]}");

        InteractionEvaluation correctEvaluation = evaluator.evaluate(
                definition,
                correct,
                Instant.parse("2026-10-07T03:10:00Z")
        );
        InteractionEvaluation incorrectEvaluation = evaluator.evaluate(
                definition,
                incorrect,
                Instant.parse("2026-10-07T03:10:00Z")
        );

        assertThat(correctEvaluation.getOutcome()).isEqualTo(InteractionEvaluationOutcome.CORRECT);
        assertThat(correctEvaluation.getScore()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(correctEvaluation.getResponseRevision()).isEqualTo(1);
        assertThat(correctEvaluation.getEvaluatorVersion())
                .isEqualTo(DeterministicInteractionEvaluator.VERSION);

        assertThat(incorrectEvaluation.getOutcome())
                .isEqualTo(InteractionEvaluationOutcome.INCORRECT);
        assertThat(incorrectEvaluation.getScore()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void orderDoesNotMatterForMultipleChoiceKeys() {
        InteractionDefinition definition = definition();
        definition.configureEvaluation("{\"correctOptionKeys\":[\"A\",\"B\"]}");

        InteractionEvaluation evaluation = evaluator.evaluate(
                definition,
                response(definition, "{\"selectedOptionKeys\":[\"B\",\"A\"]}"),
                Instant.parse("2026-10-07T03:10:00Z")
        );

        assertThat(evaluation.getOutcome()).isEqualTo(InteractionEvaluationOutcome.CORRECT);
    }

    @Test
    void malformedOrUnsupportedContractIsRejected() {
        InteractionDefinition noExpected = definition();
        noExpected.configureEvaluation("{}");

        assertThatThrownBy(() -> evaluator.evaluate(
                noExpected,
                response(noExpected, "{\"selectedOptionKeys\":[\"B\"]}"),
                Instant.parse("2026-10-07T03:10:00Z")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("corretas");

        InteractionDefinition text = new InteractionDefinition(
                "Explique",
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                provenance()
        );

        assertThatThrownBy(() -> evaluator.evaluate(
                text,
                response(text, "{\"text\":\"resposta\"}"),
                Instant.parse("2026-10-07T03:10:00Z")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("CHOICE");
    }

    private static InteractionDefinition definition() {
        InteractionDefinition definition = new InteractionDefinition(
                "Qual é a correta?",
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
        definition.configureEvaluation("{\"correctOptionKeys\":[\"B\"]}");
        definition.activate();
        return definition;
    }

    private static InteractionResponse response(
            InteractionDefinition definition,
            String raw
    ) {
        ClassSession session = new ClassSession(new Classroom("Turma", "EVAL"), "Aula");
        InteractionRun run = new InteractionRun(session, definition, 1);
        run.open(Instant.parse("2026-10-07T03:00:00Z"));
        run.lockResponses(Instant.parse("2026-10-07T03:05:00Z"));

        SessionParticipant participant = new SessionParticipant(
                session,
                new Student("001", "Aluno", null),
                true
        );
        return new InteractionResponse(
                run,
                participant,
                raw,
                Instant.parse("2026-10-07T03:01:00Z")
        );
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
