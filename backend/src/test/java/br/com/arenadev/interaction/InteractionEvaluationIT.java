package br.com.arenadev.interaction;

import br.com.arenadev.support.SharedPostgres;
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

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class InteractionEvaluationIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, InteractionEvaluationIT.class);
    }

    @Autowired private InteractionResponseService responseService;
    @Autowired private InteractionEvaluationService evaluationService;
    @Autowired private InteractionResultEngine resultEngine;
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

        InteractionResultEngine.ResultView result = resultEngine.result(locked.getId());
        assertThat(result.participation().participantCount()).isEqualTo(2);
        assertThat(result.participation().responseCount()).isEqualTo(1);
        assertThat(result.participation().participationRate()).isEqualTo(0.5);
        assertThat(result.choiceDistribution()).containsEntry("A", 0L).containsEntry("B", 1L);
        assertThat(result.evaluation().correctCount()).isEqualTo(1);
        assertThat(result.evaluation().incorrectCount()).isZero();
        assertThat(result.evaluation().accuracy()).isEqualTo(1.0);
    }

    private Fixture fixture() {
        Classroom classroom = classroomRepository.save(new Classroom("Turma", "EVAL-IT"));
        Student student = studentRepository.save(new Student("EVAL-001", "Aluno", null));
        Student observer = studentRepository.save(new Student("EVAL-002", "Sem resposta", null));
        ClassSession session = sessionRepository.save(new ClassSession(classroom, "Aula"));
        SessionParticipant participant = participantRepository.save(
                new SessionParticipant(session, student, true)
        );
        participantRepository.save(new SessionParticipant(session, observer, true));

        InteractionDefinition definition = new InteractionDefinition(
                "Qual é a correta?",
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
