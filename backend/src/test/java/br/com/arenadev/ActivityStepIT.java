package br.com.arenadev;

import br.com.arenadev.activity.*;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class ActivityStepIT {
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

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ActivityStepService stepService;

    @Autowired
    private ActivityService activityService;

    @BeforeEach
    void cleanDatabase() {
        activityRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void persistsOrderedAuthoringStepsForEveryInitialBlockType() {
        Fixture fixture = fixture("TDS", "TDS-STEP");

        List<ActivityStepService.StepView> steps = stepService.replace(
                fixture.activity().getId(),
                List.of(
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.SLIDE,
                                "Abertura",
                                "Apresente o objetivo da aula.",
                                null,
                                "# APIs REST",
                                null,
                                null
                        ),
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.QUESTION,
                                "Diagnóstico",
                                null,
                                fixture.question().getId(),
                                null,
                                null,
                                null
                        ),
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.WORD_CLOUD,
                                "Conhecimento prévio",
                                null,
                                null,
                                null,
                                new ActivityStepService.WordCloudConfigInput(
                                        "Uma palavra sobre API",
                                        3,
                                        false
                                ),
                                null
                        ),
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.POLL,
                                "Preferência da turma",
                                null,
                                null,
                                null,
                                null,
                                new ActivityStepService.PollConfigInput(
                                        "Qual ferramenta você já utilizou?",
                                        List.of(
                                                new ActivityStepService.PollOptionInput("postman", "Postman"),
                                                new ActivityStepService.PollOptionInput("insomnia", "Insomnia"),
                                                new ActivityStepService.PollOptionInput("none", "Nenhuma")
                                        ),
                                        false
                                )
                        )
                )
        );

        assertThat(steps).extracting(ActivityStepService.StepView::type)
                .containsExactly(
                        ActivityStepType.SLIDE,
                        ActivityStepType.QUESTION,
                        ActivityStepType.WORD_CLOUD,
                        ActivityStepType.POLL
                );
        assertThat(steps).extracting(ActivityStepService.StepView::position)
                .containsExactly(0, 1, 2, 3);
        assertThat(steps.get(1).questionId()).isEqualTo(fixture.question().getId());
        assertThat(steps.get(2).wordCloud().maxWordsPerParticipant()).isEqualTo(3);
        assertThat(steps.get(3).poll().options()).hasSize(3);
    }

    @Test
    void rejectsQuestionFromAnotherActivity() {
        Fixture source = fixture("Turma A", "STEP-A");
        Fixture other = fixture("Turma B", "STEP-B");

        assertThatThrownBy(() -> stepService.replace(
                source.activity().getId(),
                List.of(new ActivityStepService.StepInput(
                        null,
                        ActivityStepType.QUESTION,
                        "Questão externa",
                        null,
                        other.question().getId(),
                        null,
                        null,
                        null
                ))
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não pertence a esta atividade");
    }

    @Test
    void copiesAuthoringFlowAndRemapsQuestionReference() {
        Fixture source = fixture("Origem", "STEP-SOURCE");
        Classroom destination = classroomRepository.save(new Classroom("Destino", "STEP-DEST"));

        stepService.replace(
                source.activity().getId(),
                List.of(
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.QUESTION,
                                "Questão",
                                null,
                                source.question().getId(),
                                null,
                                null,
                                null
                        ),
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.WORD_CLOUD,
                                "Síntese",
                                null,
                                null,
                                null,
                                new ActivityStepService.WordCloudConfigInput(
                                        "Resuma a aula em uma palavra",
                                        1,
                                        true
                                ),
                                null
                        )
                )
        );

        ActivityService.ActivityView copied = activityService.copy(
                source.activity().getId(),
                destination.getId()
        );

        List<ActivityStepService.StepView> copiedSteps = stepService.list(copied.id());

        assertThat(copiedSteps).hasSize(2);
        assertThat(copiedSteps.get(0).type()).isEqualTo(ActivityStepType.QUESTION);
        assertThat(copiedSteps.get(0).questionId())
                .isNotNull()
                .isNotEqualTo(source.question().getId());
        assertThat(copiedSteps.get(1).wordCloud().liveReveal()).isTrue();
    }

    private Fixture fixture(String classroomName, String classroomCode) {
        Classroom classroom = classroomRepository.save(
                new Classroom(classroomName, classroomCode)
        );

        Activity activity = new Activity(classroom, "Roteiro ao Vivo");
        ActivityQuestion question = new ActivityQuestion(
                QuestionType.OPEN,
                "O que é uma API?",
                QuestionDifficulty.INTERMEDIATE,
                10,
                0
        );
        activity.addQuestion(question);
        activityRepository.saveAndFlush(activity);

        return new Fixture(activity, question);
    }

    private record Fixture(Activity activity, ActivityQuestion question) {}
}
