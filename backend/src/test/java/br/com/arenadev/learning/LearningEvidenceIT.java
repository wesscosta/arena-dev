package br.com.arenadev.learning;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.interaction.InteractionDefinition;
import br.com.arenadev.interaction.InteractionDefinitionRepository;
import br.com.arenadev.interaction.InteractionEvaluationMode;
import br.com.arenadev.interaction.InteractionEvaluationService;
import br.com.arenadev.interaction.InteractionPresentationMode;
import br.com.arenadev.interaction.InteractionResponseKind;
import br.com.arenadev.interaction.InteractionResponseService;
import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.interaction.InteractionRunRepository;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
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
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class LearningEvidenceIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_learning_evidence_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private ClassSessionRepository sessionRepository;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private LearningTargetRepository targetRepository;
    @Autowired private InteractionDefinitionRepository definitionRepository;
    @Autowired private InteractionRunRepository runRepository;
    @Autowired private InteractionResponseService responseService;
    @Autowired private InteractionEvaluationService evaluationService;
    @Autowired private LearningEvidenceService evidenceService;

    @Test
    void recordsIdempotentEvidenceFromEvaluatedInteractionWithoutCreatingMastery() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Evidence " + suffix, "EV" + suffix);
        var student = studentService.create(
                "EV-" + suffix,
                "Aluno Evidence " + suffix,
                null
        );
        classroomService.enroll(classroom.id(), student.id());
        var session = sessionService.start(classroom.id(), "Aula Evidence", Set.of(student.id()));

        SessionParticipant participant = participantRepository
                .findBySessionIdOrderByStudentNameAsc(session.id())
                .getFirst();

        LearningTarget target = targetRepository.save(
                new LearningTarget("LEFT JOIN", LearningTargetType.COMPETENCY, null)
        );

        InteractionDefinition definition = new InteractionDefinition(
                "Qual JOIN preserva todas as linhas da esquerda?",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                target,
                true,
                null,
                new Provenance(
                        ProvenanceOrigin.TEACHER,
                        "lesson:evidence",
                        null,
                        null,
                        Instant.parse("2026-10-07T09:00:00Z")
                )
        );
        definition.addOption("a", "INNER JOIN", 0, null);
        definition.addOption("b", "LEFT JOIN", 1, null);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");
        definition.configureEvaluation("{\"correctOptionKeys\":[\"b\"]}");
        definition.activate();
        definition = definitionRepository.saveAndFlush(definition);

        InteractionRun run = new InteractionRun(
                sessionRepository.findById(session.id()).orElseThrow(),
                definition,
                1
        );
        run.open(Instant.parse("2026-10-07T09:01:00Z"));
        run = runRepository.saveAndFlush(run);

        responseService.submit(
                run.getId(),
                participant.getId(),
                "{\"selectedOptionKeys\":[\"b\"]}"
        );

        run.lockResponses(Instant.parse("2026-10-07T09:02:00Z"));
        runRepository.saveAndFlush(run);
        evaluationService.evaluateRun(run.getId());

        List<LearningEvidence> first = evidenceService.recordForRun(run.getId());
        List<LearningEvidence> second = evidenceService.recordForRun(run.getId());

        assertThat(first).hasSize(1);
        assertThat(second).hasSize(1);
        assertThat(second.getFirst().getId()).isEqualTo(first.getFirst().getId());

        LearningEvidence evidence = first.getFirst();
        assertThat(evidence.getParticipant().getId()).isEqualTo(participant.getId());
        assertThat(evidence.getLearningTarget().getId()).isEqualTo(target.getId());
        assertThat(evidence.getSourceType()).isEqualTo(LearningEvidenceSourceType.INTERACTION);
        assertThat(evidence.getSourceId()).isEqualTo(run.getId());
        assertThat(evidence.getOutcome()).isEqualTo(LearningEvidenceOutcome.CORRECT);
        assertThat(evidence.getScore()).isEqualByComparingTo("1.0000");
        assertThat(evidence.getConfidence()).isNull();
        assertThat(evidence.provenance().origin()).isEqualTo(ProvenanceOrigin.SYSTEM);

        assertThat(evidenceService.evidenceForRun(run.getId())).hasSize(1);
    }
}
