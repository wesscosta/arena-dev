package br.com.arenadev;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.achievement.*;
import br.com.arenadev.classroom.*;
import br.com.arenadev.journey.*;
import br.com.arenadev.content.*;
import br.com.arenadev.identity.EnrollmentDeviceClaimRepository;
import br.com.arenadev.study.*;
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
    @Autowired private JourneyStudyService journeyStudyService;
    @Autowired private LearningResourceRepository learningResourceRepository;
    @Autowired private JourneyRepository journeyRepository;
    @Autowired private JourneyStageProgressRepository progressRepository;
    @Autowired private ActivitySubmissionRepository submissionRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ClassroomRepository classroomRepository;
    @Autowired private JourneyRedemptionService redemptionService;
    @Autowired private JourneyRedemptionCodeRepository redemptionCodeRepository;
    @Autowired private StudentJourneyAccessRepository studentJourneyAccessRepository;
    @Autowired private StudentJourneyStageProgressRepository studentJourneyProgressRepository;
    @Autowired private EnrollmentDeviceClaimRepository deviceClaimRepository;
    @Autowired private StudentAchievementRepository studentAchievementRepository;
    @Autowired private AchievementService achievementService;

    @BeforeEach
    void cleanDatabase() {
        studentAchievementRepository.deleteAll();
        studentJourneyProgressRepository.deleteAll();
        studentJourneyAccessRepository.deleteAll();
        deviceClaimRepository.deleteAll();
        redemptionCodeRepository.deleteAll();
        progressRepository.deleteAll();
        journeyRepository.deleteAll();
        learningResourceRepository.deleteAll();
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
        assertThat(initial.stages().getFirst().nextAction()).isEqualTo("COMPLETE_STAGE");
        assertThat(initial.stages().get(1).nextAction()).isEqualTo("WAIT_FOR_PREVIOUS_STAGE");

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
        assertThat(after.stages().getFirst().completedAt()).isNotNull();
        assertThat(after.stages().getFirst().nextAction()).isEqualTo("NONE");
    }

    @Test
    void participantCatalogReturnsOnlyPublishedJourneysWithCurrentStage() {
        Fixture fixture = fixture("Catálogo", "JRNY-C");
        journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(), "Rascunho oculto", null,
                List.of(stage("Oculta", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL))
        ));
        JourneyService.JourneyView published = createPublishedJourney(fixture,
                List.of(
                        stage("Começar", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                        stage("Depois", fixture.activity().getId(), JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.ACTIVITY_SUBMITTED)
                ));

        List<JourneyService.ParticipantJourneyView> catalog = journeyService.publishedForEnrollment(
                fixture.classroom().getId(), fixture.enrollment().getId()
        );

        assertThat(catalog).hasSize(1);
        assertThat(catalog.getFirst().journeyId()).isEqualTo(published.id());
        assertThat(catalog.getFirst().currentStage()).isNotNull();
        assertThat(catalog.getFirst().currentStage().title()).isEqualTo("Começar");
        assertThat(catalog.getFirst().currentStage().nextAction()).isEqualTo("COMPLETE_STAGE");
        assertThat(catalog.getFirst().stages()).extracting(JourneyService.StageProgressView::status)
                .containsExactly(JourneyStageProgressStatus.AVAILABLE, JourneyStageProgressStatus.LOCKED);
    }

    @Test
    void studyApiProjectionIsSequentialAndReturnsContentWithoutJoinSession() {
        Fixture fixture = fixture("Estudo", "JRNY-STUDY");
        LearningResource firstResource = new LearningResource(fixture.classroom(), "HTTP");
        firstResource.update("HTTP", "Base da Web", "# HTTP\nConteúdo de estudo.", LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, "Material do professor");
        firstResource = learningResourceRepository.save(firstResource);
        LearningResource secondResource = new LearningResource(fixture.classroom(), "REST");
        secondResource.update("REST", null, "# REST", LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, null);
        secondResource = learningResourceRepository.save(secondResource);

        JourneyService.JourneyView created = journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(), "Web", "Estudo sequencial", List.of(
                        new JourneyService.StageInput(null, "HTTP", "Fundamentos", null, JourneyUnlockRule.IMMEDIATE,
                                JourneyCompletionRule.MANUAL, null, "Fundamentos", JourneyItemType.CONTENT, firstResource.getId()),
                        new JourneyService.StageInput(null, "REST", null, null, JourneyUnlockRule.IMMEDIATE,
                                JourneyCompletionRule.MANUAL, null, "Fundamentos", JourneyItemType.CONTENT, secondResource.getId())
                )
        ));
        JourneyService.JourneyView published = journeyService.publish(created.id());
        StudyPrincipal principal = new StudyPrincipal(fixture.enrollment().getStudent().getId(), fixture.enrollment().getId(),
                fixture.classroom().getId(), StudyPrincipal.Role.STUDENT);

        var catalog = journeyStudyService.list(principal);
        assertThat(catalog).hasSize(1);
        assertThat(catalog.getFirst().currentContentTitle()).isEqualTo("HTTP");

        var initial = journeyStudyService.get(published.id(), principal);
        assertThat(initial.modules()).hasSize(1);
        assertThat(initial.modules().getFirst().contents()).extracting(JourneyStudyService.JourneyContentView::state)
                .containsExactly(JourneyStudyService.StudyState.CURRENT, JourneyStudyService.StudyState.LOCKED);

        var detail = journeyStudyService.content(published.id(), published.stages().getFirst().id(), principal);
        assertThat(detail.body()).contains("Conteúdo de estudo");
        assertThat(detail.format()).isEqualTo("MARKDOWN");

        var after = journeyStudyService.complete(published.id(), published.stages().getFirst().id(), principal);
        assertThat(after.progress().percent()).isEqualTo(50);
        assertThat(after.modules().getFirst().contents()).extracting(JourneyStudyService.JourneyContentView::state)
                .containsExactly(JourneyStudyService.StudyState.COMPLETED, JourneyStudyService.StudyState.CURRENT);
    }

    @Test
    void studyContinuityResumesFirstIncompleteContentAndFinishesJourney() {
        Fixture fixture = fixture("Continuidade", "JRNY-CONT");
        JourneyService.JourneyView journey = createPublishedJourney(fixture, List.of(
                stage("Primeiro", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                stage("Segundo", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL),
                stage("Terceiro", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL)
        ));
        StudyPrincipal principal = new StudyPrincipal(fixture.enrollment().getStudent().getId(), fixture.enrollment().getId(),
                fixture.classroom().getId(), StudyPrincipal.Role.STUDENT);

        assertThat(progressRepository.count()).isZero();
        journeyStudyService.get(journey.id(), principal);
        journeyStudyService.content(journey.id(), journey.stages().getFirst().id(), principal);
        assertThat(progressRepository.count()).isZero(); // GET never creates progress

        journeyStudyService.start(journey.id(), journey.stages().getFirst().id(), principal);
        JourneyStageProgress started = progressRepository.findByStageIdAndEnrollmentId(
                journey.stages().getFirst().id(), fixture.enrollment().getId()).orElseThrow();
        var firstStartedAt = started.getStartedAt();
        var firstUpdatedAt = started.getUpdatedAt();
        journeyStudyService.start(journey.id(), journey.stages().getFirst().id(), principal);
        JourneyStageProgress startedAgain = progressRepository.findByStageIdAndEnrollmentId(
                journey.stages().getFirst().id(), fixture.enrollment().getId()).orElseThrow();
        assertThat(startedAgain.getStartedAt()).isEqualTo(firstStartedAt);
        assertThat(startedAgain.getUpdatedAt()).isEqualTo(firstUpdatedAt); // start is idempotent

        journeyStudyService.complete(journey.id(), journey.stages().getFirst().id(), principal);
        var resumed = journeyStudyService.list(principal).getFirst();
        assertThat(resumed.started()).isTrue();
        assertThat(resumed.currentContentId()).isEqualTo(journey.stages().get(1).id());
        assertThat(resumed.progress().percent()).isEqualTo(33);

        journeyStudyService.complete(journey.id(), journey.stages().get(1).id(), principal);
        journeyStudyService.complete(journey.id(), journey.stages().get(2).id(), principal);
        var finished = journeyStudyService.list(principal).getFirst();
        assertThat(finished.progress().percent()).isEqualTo(100);
        assertThat(finished.currentContentId()).isNull();
        assertThat(finished.currentContentTitle()).isNull();
        assertThat(journeyStudyService.get(journey.id(), principal).modules().getFirst().contents())
                .extracting(JourneyStudyService.JourneyContentView::state)
                .containsOnly(JourneyStudyService.StudyState.COMPLETED);
    }

    @Test
    void teacherPreviewUsesStudyProjectionWithoutCreatingEnrollmentProgress() {
        Fixture fixture = fixture("Preview docente", "JRNY-PREVIEW");
        LearningResource resource = learningResourceRepository.save(new LearningResource(fixture.classroom(), "Leitura docente"));
        JourneyService.JourneyView draft = journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(), "Prévia", "Mesma experiência", List.of(
                        new JourneyService.StageInput(null, "Primeiro", null, null, JourneyUnlockRule.IMMEDIATE,
                                JourneyCompletionRule.MANUAL, null, "Módulo", JourneyItemType.CONTENT, resource.getId()),
                        new JourneyService.StageInput(null, "Segundo", null, null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED,
                                JourneyCompletionRule.MANUAL, null, "Módulo", JourneyItemType.CONTENT, resource.getId())
                )
        ));

        long progressBefore = progressRepository.count();
        long enrollmentsBefore = enrollmentRepository.count();
        var preview = journeyStudyService.preview(draft.id());
        var content = journeyStudyService.previewContent(draft.id(), draft.stages().getFirst().id());

        assertThat(preview.modules().getFirst().contents())
                .extracting(JourneyStudyService.JourneyContentView::state)
                .containsOnly(JourneyStudyService.StudyState.CURRENT);
        assertThat(content.title()).isEqualTo("Primeiro");
        assertThat(progressRepository.count()).isEqualTo(progressBefore);
        assertThat(enrollmentRepository.count()).isEqualTo(enrollmentsBefore);
    }

    @Test
    void studyApiHidesDraftsAndRejectsAnotherEnrollmentClassroom() {
        Fixture source = fixture("Fonte estudo", "JRNY-SOURCE");
        Fixture other = fixture("Outra turma estudo", "JRNY-OTHER");
        JourneyService.JourneyView draft = journeyService.create(new JourneyService.JourneyInput(
                source.classroom().getId(), "Rascunho", null,
                List.of(stage("Conteúdo", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL))
        ));
        StudyPrincipal sourcePrincipal = new StudyPrincipal(source.enrollment().getStudent().getId(), source.enrollment().getId(),
                source.classroom().getId(), StudyPrincipal.Role.STUDENT);
        StudyPrincipal otherPrincipal = new StudyPrincipal(other.enrollment().getStudent().getId(), other.enrollment().getId(),
                other.classroom().getId(), StudyPrincipal.Role.STUDENT);

        assertThat(journeyStudyService.list(sourcePrincipal)).isEmpty();
        assertThatThrownBy(() -> journeyStudyService.get(draft.id(), sourcePrincipal))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("404");
        assertThatThrownBy(() -> journeyStudyService.get(draft.id(), otherPrincipal))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void studyVisibilityIsMultiClassroomAndPreservesProgressWhenDisabled() {
        Fixture source = fixture("Estudo A", "STUDY-A");
        JourneyService.JourneyView journeyA = createPublishedJourney(source, List.of(
                stage("A1", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                stage("A2", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL)
        ));
        Classroom classroomB = new Classroom("Estudo B", "STUDY-B");
        classroomB.setStudentStudyAccessEnabled(true);
        classroomB = classroomRepository.save(classroomB);
        enrollmentRepository.save(new Enrollment(classroomB, source.enrollment().getStudent()));
        JourneyService.JourneyView journeyB = journeyService.publish(journeyService.create(
                new JourneyService.JourneyInput(classroomB.getId(), "Jornada B", null,
                        List.of(stage("B1", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL)))
        ).id());

        StudyPrincipal principal = new StudyPrincipal(
                source.enrollment().getStudent().getId(), source.enrollment().getId(),
                source.classroom().getId(), StudyPrincipal.Role.STUDENT
        );
        assertThat(journeyStudyService.list(principal)).extracting(JourneyStudyService.JourneyStudySummary::id)
                .containsExactlyInAnyOrder(journeyA.id(), journeyB.id());

        journeyStudyService.complete(journeyA.id(), journeyA.stages().getFirst().id(), principal);
        assertThat(journeyStudyService.get(journeyA.id(), principal).progress().percent()).isEqualTo(50);

        source.classroom().setStudentStudyAccessEnabled(false);
        classroomRepository.saveAndFlush(source.classroom());
        assertThat(journeyStudyService.list(principal)).extracting(JourneyStudyService.JourneyStudySummary::id)
                .containsExactly(journeyB.id());
        assertThatThrownBy(() -> journeyStudyService.get(journeyA.id(), principal))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("404");

        source.classroom().setStudentStudyAccessEnabled(true);
        classroomRepository.saveAndFlush(source.classroom());
        assertThat(journeyStudyService.get(journeyA.id(), principal).progress().percent()).isEqualTo(50);
    }

    @Test
    void newClassroomStartsWithStudyAccessDisabled() {
        Classroom classroom = new Classroom("Nova turma", "STUDY-OFF");
        assertThat(classroom.isStudentStudyAccessEnabled()).isFalse();
    }

    @Test
    void redeemedJourneyPersistsOutsideClassroomVisibilityAndKeepsItsOwnProgress() {
        Fixture fixture = fixture("Resgate", "JRNY-R");
        JourneyService.JourneyView journey = createPublishedJourney(fixture, List.of(
                stage("Conteúdo 1", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL),
                stage("Conteúdo 2", null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL)
        ));
        var code = redemptionService.enable(journey.id());
        StudyPrincipal principal = new StudyPrincipal(
                fixture.enrollment().getStudent().getId(), fixture.enrollment().getId(),
                fixture.classroom().getId(), StudyPrincipal.Role.STUDENT
        );

        fixture.classroom().setStudentStudyAccessEnabled(false);
        classroomRepository.saveAndFlush(fixture.classroom());
        assertThat(journeyStudyService.list(principal)).isEmpty();

        var redeemed = redemptionService.redeem(code.code(), principal);
        assertThat(redeemed.journeyId()).isEqualTo(journey.id());
        assertThat(journeyStudyService.list(principal)).extracting(JourneyStudyService.JourneyStudySummary::id).containsExactly(journey.id());

        journeyStudyService.complete(journey.id(), journey.stages().getFirst().id(), principal);
        redemptionService.disable(journey.id());
        assertThat(journeyStudyService.get(journey.id(), principal).progress().percent()).isEqualTo(50);
        assertThat(redemptionService.status(journey.id()).redeemedCount()).isEqualTo(1);
    }

    @Test
    void journeyCodeCanBootstrapFirstStudyAccessWithoutPriorLiveSession() {
        Fixture fixture = fixture("Primeiro acesso", "JRNY-BOOT");
        JourneyService.JourneyView journey = createPublishedJourney(fixture, List.of(
                stage("Conteúdo inicial", null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL)
        ));
        var code = redemptionService.enable(journey.id());

        var preview = redemptionService.preview(code.code());
        assertThat(preview.journeyId()).isEqualTo(journey.id());
        assertThat(preview.classroomId()).isEqualTo(fixture.classroom().getId());

        var result = redemptionService.redeemWithIdentity(
                code.code(),
                fixture.enrollment().getStudent().getRegistration()
        );

        assertThat(result.classroomId()).isEqualTo(fixture.classroom().getId());
        assertThat(result.deviceToken()).isNotBlank();
        assertThat(result.redemption().journeyId()).isEqualTo(journey.id());
        assertThat(result.redemption().alreadyAdded()).isFalse();
        assertThat(studentJourneyAccessRepository.findByStudentIdAndJourneyId(
                fixture.enrollment().getStudent().getId(), journey.id()
        )).isPresent();
        assertThat(deviceClaimRepository.count()).isEqualTo(1);
    }

    @Test
    void draftAuthoringGroupsStagesIntoModulesAndPersistsModuleRename() {
        Fixture fixture = fixture("Builder", "JRNY-BLD");
        JourneyService.JourneyView created = journeyService.create(new JourneyService.JourneyInput(
                fixture.classroom().getId(),
                "Backend",
                null,
                List.of(
                        new JourneyService.StageInput(null, "HTTP", null, null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, null, "Fundamentos", JourneyItemType.CONTENT, null),
                        new JourneyService.StageInput(null, "REST", null, null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL, null, "Fundamentos", JourneyItemType.CONTENT, null)
                )
        ));

        assertThat(created.stages()).extracting(JourneyService.StageView::sectionTitle)
                .containsExactly("Fundamentos", "Fundamentos");
        assertThat(created.stages().getFirst().sectionId()).isNotNull();
        assertThat(created.stages().get(1).sectionId()).isEqualTo(created.stages().getFirst().sectionId());

        String sectionId = created.stages().getFirst().sectionId().toString();
        JourneyService.JourneyView updated = journeyService.update(created.id(), new JourneyService.JourneyInput(
                fixture.classroom().getId(),
                "Backend",
                null,
                List.of(
                        new JourneyService.StageInput(created.stages().getFirst().id().toString(), "HTTP", null, null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, sectionId, "Fundamentos da Web", JourneyItemType.CONTENT, null),
                        new JourneyService.StageInput(created.stages().get(1).id().toString(), "REST", null, null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED, JourneyCompletionRule.MANUAL, sectionId, "Fundamentos da Web", JourneyItemType.CONTENT, null)
                )
        ));

        assertThat(updated.stages()).extracting(JourneyService.StageView::sectionTitle)
                .containsExactly("Fundamentos da Web", "Fundamentos da Web");
        assertThat(updated.stages()).extracting(JourneyService.StageView::itemType)
                .containsExactly(JourneyItemType.CONTENT, JourneyItemType.CONTENT);
    }

    @Test
    void achievementsAreDerivedFromProgressAndRemainIdempotent() {
        Fixture fixture = fixture("Conquistas", "ACH-1");
        JourneyService.JourneyView journey = createPublishedJourney(fixture, List.of(
                new JourneyService.StageInput(null, "Conteúdo 1", null, null, JourneyUnlockRule.IMMEDIATE,
                        JourneyCompletionRule.MANUAL, null, "Módulo 1", JourneyItemType.CONTENT, null),
                new JourneyService.StageInput(null, "Conteúdo 2", null, null, JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED,
                        JourneyCompletionRule.MANUAL, null, "Módulo 1", JourneyItemType.CONTENT, null)
        ));
        StudyPrincipal principal = new StudyPrincipal(fixture.enrollment().getStudent().getId(), fixture.enrollment().getId(),
                fixture.classroom().getId(), StudyPrincipal.Role.STUDENT);

        var first = journeyStudyService.complete(journey.id(), journey.stages().getFirst().id(), principal);
        assertThat(first.newlyUnlockedAchievements()).extracting(AchievementService.AchievementView::code)
                .containsExactly(AchievementCode.FIRST_CONTENT_COMPLETED);

        var second = journeyStudyService.complete(journey.id(), journey.stages().get(1).id(), principal);
        assertThat(second.newlyUnlockedAchievements()).extracting(AchievementService.AchievementView::code)
                .containsExactlyInAnyOrder(AchievementCode.FIRST_MODULE_COMPLETED, AchievementCode.FIRST_JOURNEY_COMPLETED);

        journeyStudyService.complete(journey.id(), journey.stages().get(1).id(), principal);
        assertThat(studentAchievementRepository.findByStudentIdOrderByUnlockedAtAsc(fixture.enrollment().getStudent().getId()))
                .hasSize(3);
        assertThat(achievementService.list(fixture.enrollment().getStudent().getId()).unlocked()).isEqualTo(3);
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
                        new JourneyService.StageInput(published.stages().getFirst().id().toString(), "Etapa única", null, null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, null, null, null, null),
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
        return new JourneyService.StageInput(null, title, null, activityId, unlockRule, completionRule, null, null, null, null);
    }

    private Fixture fixture(String classroomName, String classroomCode) {
        Classroom classroom = new Classroom(classroomName, classroomCode);
        classroom.setStudentStudyAccessEnabled(true);
        classroom = classroomRepository.save(classroom);
        Student student = studentRepository.save(new Student("REG-" + classroomCode, "Aluno " + classroomCode, null));
        Enrollment enrollment = enrollmentRepository.save(new Enrollment(classroom, student));
        Activity activity = activityRepository.save(new Activity(classroom, "Atividade " + classroomCode));
        return new Fixture(classroom, enrollment, activity);
    }

    private record Fixture(Classroom classroom, Enrollment enrollment, Activity activity) {}
}
