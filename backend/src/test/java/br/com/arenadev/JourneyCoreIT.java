package br.com.arenadev;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.*;
import br.com.arenadev.journey.*;
import br.com.arenadev.submission.*;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class JourneyCoreIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private JourneyService journeyService;
    @Autowired private JourneyRepository journeyRepository;
    @Autowired private JourneyStageProgressRepository progressRepository;
    @Autowired private ActivitySubmissionRepository submissionRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ClassroomRepository classroomRepository;

    @BeforeEach
    void cleanDatabase() {
        progressRepository.deleteAll();
        journeyRepository.deleteAll();
        submissionRepository.deleteAll();
        activityRepository.deleteAll();
        enrollmentRepository.deleteAll();
        studentRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void createsPublishesAndKeepsOrderedStages() {
        Fixture fixture = fixture("TDS Jornada", "JRNY-1");

        JourneyService.JourneyView created = journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(),
                "Backend APIs",
                "Trilha principal da unidade curricular.",
                List.of(
                        stage("Fundamentos", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL),
                        stage("Prática", fixture.activity().getId(), JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.ACTIVITY_SUBMITTED)
                )
        ));

        assertThat(created.status()).isEqualTo(JourneyStatus.DRAFT);
        assertThat(created.stages()).extracting(JourneyService.StageView::position).containsExactly(0, 1);
        assertThat(created.stages().getFirst().unlockRule()).isEqualTo(JourneyUnlockRule.IMMEDIATE);

        JourneyService.JourneyView published = journeyService.publish(created.id());
        assertThat(published.status()).isEqualTo(JourneyStatus.PUBLISHED);
    }

    @Test
    void rejectsActivityFromAnotherClassroom() {
        Fixture source = fixture("Origem", "JRNY-A");
        Fixture other = fixture("Outra", "JRNY-B");

        assertThatThrownBy(() -> journeyService.create(new JourneyService.JourneyInput(
                source.classroom().getId(),
                "Jornada inválida",
                null,
                List.of(stage("Etapa externa", other.activity().getId(), JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.ACTIVITY_SUBMITTED))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mesma turma");
    }

    @Test
    void manualCompletionUnlocksTheFollowingStage() {
        Fixture fixture = fixture("Progressão", "JRNY-P");
        JourneyService.JourneyView journey = createPublishedJourney(fixture,
                List.of(
                        stage("Etapa 1", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                        stage("Etapa 2", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL)
                ));

        JourneyService.JourneyProgressView initial = journeyService.progress(journey.id(), fixture.enrollment().getId());
        assertThat(initial.stages()).extracting(JourneyService.StageProgressView::status)
                .containsExactly(JourneyStageProgressStatus.AVAILABLE, JourneyStageProgressStatus.LOCKED);

        JourneyService.JourneyProgressView completed = journeyService.completeStage(
                journey.id(), journey.stages().getFirst().id(), fixture.enrollment().getId()
        );

        assertThat(completed.completedStages()).isEqualTo(1);
        assertThat(completed.percent()).isEqualTo(50);
        assertThat(completed.stages()).extracting(JourneyService.StageProgressView::status)
                .containsExactly(JourneyStageProgressStatus.COMPLETED, JourneyStageProgressStatus.AVAILABLE);
    }

    @Test
    void submittedActivityCompletesStageFromTheSubmissionSourceOfTruth() {
        Fixture fixture = fixture("Entrega", "JRNY-S");
        JourneyService.JourneyView journey = createPublishedJourney(fixture,
                List.of(stage("Entrega prática", fixture.activity().getId(), JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.ACTIVITY_SUBMITTED)));

        JourneyService.JourneyProgressView before = journeyService.progress(journey.id(), fixture.enrollment().getId());
        assertThat(before.stages().getFirst().status()).isEqualTo(JourneyStageProgressStatus.AVAILABLE);

        ActivitySubmission submission = new ActivitySubmission(fixture.activity(), fixture.enrollment(), 1, SubmissionSource.ARENA);
        submission.submit(Instant.now());
        submissionRepository.saveAndFlush(submission);

        JourneyService.JourneyProgressView after = journeyService.progress(journey.id(), fixture.enrollment().getId());
        assertThat(after.completedStages()).isEqualTo(1);
        assertThat(after.percent()).isEqualTo(100);
        assertThat(after.stages().getFirst().status()).isEqualTo(JourneyStageProgressStatus.COMPLETED);
    }

    @Test
    void publishedJourneyRejectsStructuralStageChanges() {
        Fixture fixture = fixture("Imutabilidade", "JRNY-I");
        JourneyService.JourneyView published = createPublishedJourney(fixture,
                List.of(stage("Etapa única", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL)));

        assertThatThrownBy(() -> journeyService.update(published.id(), new JourneyService.JourneyInput(
                fixture.classroom().getId(),
                "Título atualizado",
                null,
                List.of(
                        new JourneyService.StageInput(published.stages().getFirst().id().toString(), "Etapa única", null, null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                        stage("Etapa extra", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL)
                )
        )))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("não podem ser reestruturadas");
    }

    private JourneyService.JourneyView createPublishedJourney(Fixture fixture, List<JourneyService.StageInput> stages) {
        JourneyService.JourneyView created = journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(), "Jornada", null, stages
        ));
        return journeyService.publish(created.id());
    }

    private JourneyService.StageInput stage(
            String title,
            java.util.UUID activityId,
            JourneyUnlockRule unlockRule,
            JourneyCompletionRule completionRule
    ) {
        return new JourneyService.StageInput(null, title, null, activityId, unlockRule, completionRule);
    }

    private Fixture fixture(String classroomName, String classroomCode) {
        Classroom classroom = classroomRepository.save(new Classroom(classroomName, classroomCode));
        Student student = studentRepository.save(new Student("REG-" + classroomCode, "Aluno " + classroomCode, null));
        Enrollment enrollment = enrollmentRepository.save(new Enrollment(classroom, student));
        Activity activity = activityRepository.save(new Activity(classroom, "Atividade " + classroomCode));
        return new Fixture(classroom, enrollment, activity);
    }

    private record Fixture(Classroom classroom, Enrollment enrollment, Activity activity) {}
}
