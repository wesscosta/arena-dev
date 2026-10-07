package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InteractionResponseServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-07T03:00:00Z");

    @Test
    void identicalRetryIsIdempotent() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.ONE_SUBMISSION);
        InteractionResponse existing = new InteractionResponse(
                fixture.run(),
                fixture.participant(),
                "{\"choice\":\"A\"}",
                NOW.minusSeconds(5)
        );
        ServiceFixture service = service(fixture, Optional.of(existing));

        InteractionResponse result = service.service().submit(
                fixture.runId(),
                fixture.participantId(),
                "{\"choice\":\"A\"}"
        );

        assertThat(result).isSameAs(existing);
        assertThat(result.getRevision()).isEqualTo(1);
        verify(service.responseRepository(), never()).save(any());
    }

    @Test
    void updateUntilCloseChangesPayloadAndRevision() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        InteractionResponse existing = new InteractionResponse(
                fixture.run(),
                fixture.participant(),
                "{\"choice\":\"A\"}",
                NOW.minusSeconds(5)
        );
        ServiceFixture service = service(fixture, Optional.of(existing));

        InteractionResponse result = service.service().submit(
                fixture.runId(),
                fixture.participantId(),
                "{\"choice\":\"B\"}"
        );

        assertThat(result.getResponseJson()).isEqualTo("{\"choice\":\"B\"}");
        assertThat(result.getRevision()).isEqualTo(2);
        assertThat(result.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void oneSubmissionRejectsChangedPayload() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.ONE_SUBMISSION);
        InteractionResponse existing = new InteractionResponse(
                fixture.run(),
                fixture.participant(),
                "{\"choice\":\"A\"}",
                NOW.minusSeconds(5)
        );
        ServiceFixture service = service(fixture, Optional.of(existing));

        assertThatThrownBy(() -> service.service().submit(
                fixture.runId(),
                fixture.participantId(),
                "{\"choice\":\"B\"}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("já foi registrada");

        assertThat(existing.getRevision()).isEqualTo(1);
    }

    @Test
    void lockedRunRejectsNewResponse() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        when(fixture.run().acceptsResponses()).thenReturn(false);
        ServiceFixture service = service(fixture, Optional.empty());

        assertThatThrownBy(() -> service.service().submit(
                fixture.runId(),
                fixture.participantId(),
                "{\"choice\":\"A\"}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aceitando respostas");

        verify(service.participantRepository(), never())
                .findByIdAndSessionIdForUpdate(any(), any());
    }

    private static ServiceFixture service(Fixture fixture, Optional<InteractionResponse> existing) {
        InteractionRunRepository runRepository = mock(InteractionRunRepository.class);
        InteractionResponseRepository responseRepository = mock(InteractionResponseRepository.class);
        SessionParticipantRepository participantRepository = mock(SessionParticipantRepository.class);

        when(runRepository.findByIdForUpdate(fixture.runId())).thenReturn(Optional.of(fixture.run()));
        when(participantRepository.findByIdAndSessionIdForUpdate(
                fixture.participantId(),
                fixture.sessionId()
        )).thenReturn(Optional.of(fixture.participant()));
        when(responseRepository.findByRunIdAndParticipantId(
                fixture.runId(),
                fixture.participantId()
        )).thenReturn(existing);

        InteractionResponseService service = new InteractionResponseService(
                runRepository,
                responseRepository,
                participantRepository,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );

        return new ServiceFixture(service, responseRepository, participantRepository);
    }

    private static Fixture fixture(InteractionSubmissionPolicy policy) {
        UUID sessionId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();

        Classroom classroom = mock(Classroom.class);
        ClassSession session = mock(ClassSession.class);
        when(session.getId()).thenReturn(sessionId);
        when(session.getClassroom()).thenReturn(classroom);

        InteractionDefinition definition = new InteractionDefinition(
                "Prompt",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                new Provenance(ProvenanceOrigin.SYSTEM, null, null, null, NOW.minusSeconds(60))
        );
        definition.configureSubmissionPolicy(policy);
        definition.addOption("A", "A", 0, null);
        definition.addOption("B", "B", 1, null);
        definition.activate();

        InteractionRun run = mock(InteractionRun.class);
        when(run.getId()).thenReturn(runId);
        when(run.getSession()).thenReturn(session);
        when(run.getDefinition()).thenReturn(definition);
        when(run.acceptsResponses()).thenReturn(true);

        SessionParticipant participant = mock(SessionParticipant.class);
        when(participant.getId()).thenReturn(participantId);

        return new Fixture(sessionId, runId, participantId, run, participant);
    }

    private record Fixture(
            UUID sessionId,
            UUID runId,
            UUID participantId,
            InteractionRun run,
            SessionParticipant participant
    ) {
    }

    private record ServiceFixture(
            InteractionResponseService service,
            InteractionResponseRepository responseRepository,
            SessionParticipantRepository participantRepository
    ) {
    }
}
