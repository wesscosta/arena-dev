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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class InteractionEvaluationIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_interaction_evaluation_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private InteractionResponseService responseService;
    @Autowired private InteractionEvaluationService evaluationService;
    @Autowired private InteractionEvaluationRepository evaluationRepository;
    @Autowired private InteractionResponseRepository responseRepository;
    @Autowired private InteractionRunRepository runRepository;
    @Autowired private InteractionDefinitionRepository definitionRepository;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private ClassSessionRepository sessionRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ClassroomRepository classroomRepository;

    @BeforeEach
    void cleanDatabase() {
        evaluationRepository.deleteAll();
        responseRepository.deleteAll();
        runRepository.deleteAll();
        definitionRepository.deleteAll();
        participantRepository.deleteAll();
        sessionRepository.deleteAll();
        studentRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void evaluatesFinalResponseRevisionOnceAndKeepsRawResponseSeparate() {
        Fixture fixture = fixture();

        InteractionResponse first = responseService.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"selectedOptionKeys\":[\"A\"]}"
        );
        InteractionResponse finalResponse = responseService.submit(
                fixture.run().getId(),
                fixture.participant().getId(),
                "{\"selectedOptionKeys\":[\"B\"]}"
        );
        assertThat(first.getId()).isEqualTo(finalResponse.getId());
        assertThat(finalResponse.getRevision()).isEqualTo(2);

        InteractionRun locked = runRepository.findById(fixture.run().getId()).orElseThrow();
        locked.lockResponses(Instant.parse("2026-10-07T03:05:00Z"));
        runRepository.saveAndFlush(locked);

        List<InteractionEvaluation> firstPass = evaluationService.evaluateRun(locked.getId());
        List<InteractionEvaluation> retry = evaluationService.evaluateRun(locked.getId());

        assertThat(firstPass).hasSize(1);
        assertThat(retry).hasSize(1);
        assertThat(evaluationRepository.count()).isEqualTo(1);

        InteractionEvaluation evaluation = firstPass.getFirst();
        assertThat(evaluation.getOutcome()).isEqualTo(InteractionEvaluationOutcome.CORRECT);
        assertThat(evaluation.getResponseRevision()).isEqualTo(2);

        InteractionResponse raw = responseRepository.findById(finalResponse.getId()).orElseThrow();
        assertThat(raw.getResponseJson())
                .isEqualTo("{\"selectedOptionKeys\":[\"B\"]}");
        assertThat(raw.getRevision()).isEqualTo(2);
    }

    private Fixture fixture() {
        Classroom classroom = classroomRepository.save(new Classroom("Turma", "EVAL-IT"));
        Student student = studentRepository.save(new Student("EVAL-001", "Aluno", null));
        ClassSession session = sessionRepository.save(new ClassSession(classroom, "Aula"));
        SessionParticipant participant = participantRepository.save(
                new SessionParticipant(session, student, true)
        );

        InteractionDefinition definition = new InteractionDefinition(
                "Qual é a correta?",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                true,
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
        definition.addOption("B", "B", 1, null);
        definition.configureEvaluation("{\"correctOptionKeys\":[\"B\"]}");
        definition.activate();
        definition = definitionRepository.save(definition);

        InteractionRun run = new InteractionRun(session, definition, 1);
        run.open(Instant.parse("2026-10-07T03:00:00Z"));
        run = runRepository.saveAndFlush(run);

        return new Fixture(run, participant);
    }

    private record Fixture(InteractionRun run, SessionParticipant participant) {
    }
}
