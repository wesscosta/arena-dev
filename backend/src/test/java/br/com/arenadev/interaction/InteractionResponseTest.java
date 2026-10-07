package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.SessionParticipant;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InteractionResponseTest {
    @Test
    void changedPayloadIncrementsRevisionButKeepsFirstSubmissionTimestamp() {
        Instant firstAt = Instant.parse("2026-10-07T03:00:00Z");
        InteractionResponse response = new InteractionResponse(
                run(),
                participant(),
                "{\"choice\":\"A\"}",
                firstAt
        );

        response.updatePayload("{\"choice\":\"B\"}", firstAt.plusSeconds(10));

        assertThat(response.getResponseJson()).isEqualTo("{\"choice\":\"B\"}");
        assertThat(response.getRevision()).isEqualTo(2);
        assertThat(response.getSubmittedAt()).isEqualTo(firstAt);
        assertThat(response.getUpdatedAt()).isEqualTo(firstAt.plusSeconds(10));
    }

    @Test
    void identicalPayloadIsRecognizedForIdempotentRetry() {
        InteractionResponse response = new InteractionResponse(
                run(),
                participant(),
                " {\"choice\":\"A\"} ",
                Instant.parse("2026-10-07T03:00:00Z")
        );

        assertThat(response.samePayload("{\"choice\":\"A\"}")).isTrue();
        assertThat(response.getRevision()).isEqualTo(1);
    }

    @Test
    void emptyRawResponseIsRejected() {
        assertThatThrownBy(() -> new InteractionResponse(
                run(),
                participant(),
                " ",
                Instant.parse("2026-10-07T03:00:00Z")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bruta");
    }

    private static InteractionRun run() {
        ClassSession session = new ClassSession(new Classroom("Turma", "RSP"), "Aula");
        InteractionDefinition definition = new InteractionDefinition(
                "Prompt",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        null,
                        null,
                        null,
                        Instant.parse("2026-10-07T02:00:00Z")
                )
        );
        definition.addOption("A", "A", 0, null);
        definition.activate();
        InteractionRun run = new InteractionRun(session, definition, 1);
        run.open(Instant.parse("2026-10-07T02:30:00Z"));
        return run;
    }

    private static SessionParticipant participant() {
        ClassSession session = new ClassSession(new Classroom("Turma", "RSP2"), "Aula");
        return new SessionParticipant(session, new Student("001", "Aluno", null), true);
    }
}
