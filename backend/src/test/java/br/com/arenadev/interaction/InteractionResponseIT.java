package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class InteractionResponseIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_interaction_response_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private InteractionResponseService service;
    @Autowired private InteractionResponseRepository responseRepository;
    @Autowired private InteractionRunRepository runRepository;
    @Autowired private InteractionDefinitionRepository definitionRepository;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private ClassSessionRepository sessionRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ClassroomRepository classroomRepository;

    @BeforeEach
    void cleanDatabase() {
        responseRepository.deleteAll();
        runRepository.deleteAll();
        definitionRepository.deleteAll();
        participantRepository.deleteAll();
        sessionRepository.deleteAll();
        studentRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void updateUntilCloseIsIdempotentAndKeepsSingleResponseRow() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);

        InteractionResponse first = service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"A\"}"
        );
        InteractionResponse retry = service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"A\"}"
        );
        InteractionResponse changed = service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"B\"}"
        );

        assertThat(retry.getId()).isEqualTo(first.getId());
        assertThat(changed.getId()).isEqualTo(first.getId());
        assertThat(changed.getRevision()).isEqualTo(2);
        assertThat(changed.getResponseJson()).isEqualTo("{\"choice\":\"B\"}");
        assertThat(responseRepository.countByRunId(fixture.run().getId())).isEqualTo(1);
    }

    @Test
    void oneSubmissionAllowsIdenticalRetryButRejectsChangedVote() {
        Fixture fixture = fixture(InteractionSubmissionPolicy.ONE_SUBMISSION);

        InteractionResponse first = service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"A\"}"
        );
        InteractionResponse retry = service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"A\"}"
        );

        assertThat(retry.getId()).isEqualTo(first.getId());
        assertThat(responseRepository.countByRunId(fixture.run().getId())).isEqualTo(1);

        assertThatThrownBy(() -> service.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"choice\":\"B\"}"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("já foi registrada");
    }

    private Fixture fixture(InteractionSubmissionPolicy policy) {
        String suffix = policy.name();
        Classroom classroom = classroomRepository.save(new Classroom("Turma " + suffix, "R-" + suffix));
        Student student = studentRepository.save(new Student("REG-" + suffix, "Aluno " + suffix, null));
        ClassSession session = sessionRepository.save(new ClassSession(classroom, "Aula"));

        SessionParticipant participant = participantRepository.save(
                new SessionParticipant(session, student, true)
        );

        InteractionDefinition definition = new InteractionDefinition(
                "Escolha uma alternativa",
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
                        Instant.parse("2026-10-07T03:00:00Z")
                )
        );
        definition.configureSubmissionPolicy(policy);
        definition.addOption("A", "Alternativa A", 0, null);
        definition.addOption("B", "Alternativa B", 1, null);
        definition.configureEvaluation("{\"correctOptionKeys\":[\"B\"]}");
        definition.activate();
        definition = definitionRepository.save(definition);

        InteractionRun run = new InteractionRun(session, definition, 1);
        run.open(Instant.parse("2026-10-07T03:01:00Z"));
        run = runRepository.saveAndFlush(run);

        return new Fixture(run, participant);
    }

    private record Fixture(InteractionRun run, SessionParticipant participant) {
    }
}
