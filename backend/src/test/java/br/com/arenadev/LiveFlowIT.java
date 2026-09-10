package br.com.arenadev;

import br.com.arenadev.activity.*;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.dynamic.SessionDynamicRepository;
import br.com.arenadev.poll.PollRoundRepository;
import br.com.arenadev.poll.PollVoteRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.stage.LiveStageType;
import br.com.arenadev.wordcloud.WordCloudRoundRepository;
import br.com.arenadev.wordcloud.WordCloudService;
import br.com.arenadev.wordcloud.WordCloudSubmissionRepository;
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

@Testcontainers
@SpringBootTest
class LiveFlowIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private ClassroomRepository classroomRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private ActivityStepService activityStepService;
    @Autowired private ClassSessionRepository sessionRepository;
    @Autowired private SessionDynamicRepository dynamicRepository;
    @Autowired private MechanicsService mechanicsService;
    @Autowired private LiveStageService liveStageService;
    @Autowired private WordCloudService wordCloudService;
    @Autowired private WordCloudSubmissionRepository wordCloudSubmissionRepository;
    @Autowired private WordCloudRoundRepository wordCloudRoundRepository;
    @Autowired private PollVoteRepository pollVoteRepository;
    @Autowired private PollRoundRepository pollRoundRepository;

    @BeforeEach
    void cleanDatabase() {
        pollVoteRepository.deleteAll();
        pollRoundRepository.deleteAll();
        wordCloudSubmissionRepository.deleteAll();
        wordCloudRoundRepository.deleteAll();
        dynamicRepository.deleteAll();
        sessionRepository.deleteAll();
        activityRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void navigatesPreparedFlowAndOrchestratesTheSharedStage() {
        Fixture fixture = fixture();

        MechanicsService.RuntimeView selected = mechanicsService.setArenaSource(
                fixture.session().getId(),
                fixture.activity().getId()
        );

        assertThat(selected.currentStepId()).isNull();
        assertThat(selected.currentStepPosition()).isNull();

        MechanicsService.LiveFlowView initial = mechanicsService.getLiveFlow(
                fixture.session().getId()
        );

        assertThat(initial.steps()).hasSize(4);
        assertThat(initial.started()).isFalse();
        assertThat(initial.hasPrevious()).isFalse();
        assertThat(initial.hasNext()).isTrue();

        MechanicsService.LiveFlowResult started = mechanicsService.startLiveFlow(
                fixture.session().getId()
        );

        assertThat(started.liveFlow().currentIndex()).isEqualTo(0);
        assertThat(started.liveFlow().steps().get(0).type()).isEqualTo(ActivityStepType.SLIDE);
        assertThat(started.runtime().currentQuestionId()).isNull();
        assertThat(started.stage().primary().type()).isEqualTo(LiveStageType.SLIDE);
        assertThat(started.stage().primary().step().slideContent()).isEqualTo("# APIs REST");
        assertThat(liveStageService.participantState(fixture.session().getId()).primary().type())
                .isEqualTo(LiveStageType.IDLE);

        MechanicsService.LiveFlowResult question = mechanicsService.nextLiveFlow(
                fixture.session().getId()
        );

        assertThat(question.liveFlow().currentIndex()).isEqualTo(1);
        assertThat(question.liveFlow().steps().get(1).type()).isEqualTo(ActivityStepType.QUESTION);
        assertThat(question.runtime().currentQuestionId()).isEqualTo(fixture.question().getId().toString());
        assertThat(question.runtime().answeredQuestionIds()).contains(fixture.question().getId().toString());
        assertThat(question.stage().primary().type()).isEqualTo(LiveStageType.QUESTION);
        assertThat(question.stage().primary().step().question().statement()).isEqualTo("O que é uma API?");
        assertThat(question.stage().primary().step().question().options()).isEmpty();

        MechanicsService.LiveFlowResult cloud = mechanicsService.nextLiveFlow(
                fixture.session().getId()
        );

        assertThat(cloud.liveFlow().currentIndex()).isEqualTo(2);
        assertThat(cloud.liveFlow().steps().get(2).type()).isEqualTo(ActivityStepType.WORD_CLOUD);
        assertThat(cloud.runtime().currentQuestionId()).isNull();
        assertThat(cloud.stage().primary().type()).isEqualTo(LiveStageType.WORD_CLOUD);
        assertThat(wordCloudRoundRepository.count()).isEqualTo(1);
        var cloudRoundId = cloud.stage().primary().sourceId();

        MechanicsService.LiveFlowResult poll = mechanicsService.nextLiveFlow(
                fixture.session().getId()
        );

        assertThat(poll.liveFlow().currentIndex()).isEqualTo(3);
        assertThat(poll.liveFlow().steps().get(3).type()).isEqualTo(ActivityStepType.POLL);
        assertThat(poll.stage().primary().type()).isEqualTo(LiveStageType.POLL);
        assertThat(pollRoundRepository.count()).isEqualTo(1);
        var pollRoundId = poll.stage().primary().sourceId();

        MechanicsService.LiveFlowResult previous = mechanicsService.previousLiveFlow(
                fixture.session().getId()
        );

        assertThat(previous.liveFlow().currentIndex()).isEqualTo(2);
        assertThat(previous.stage().primary().type()).isEqualTo(LiveStageType.WORD_CLOUD);
        assertThat(previous.stage().primary().sourceId()).isEqualTo(cloudRoundId);
        assertThat(wordCloudRoundRepository.count()).isEqualTo(1);

        MechanicsService.LiveFlowResult samePoll = mechanicsService.nextLiveFlow(
                fixture.session().getId()
        );
        assertThat(samePoll.stage().primary().sourceId()).isEqualTo(pollRoundId);
        assertThat(pollRoundRepository.count()).isEqualTo(1);
    }

    @Test
    void dynamicEventsDoNotAdvanceThePreparedFlow() {
        Fixture fixture = fixture();
        mechanicsService.setArenaSource(fixture.session().getId(), fixture.activity().getId());
        mechanicsService.startLiveFlow(fixture.session().getId());
        mechanicsService.nextLiveFlow(fixture.session().getId());
        MechanicsService.LiveFlowResult cloud = mechanicsService.nextLiveFlow(fixture.session().getId());

        wordCloudService.reveal(fixture.session().getId(), cloud.stage().primary().sourceId());

        MechanicsService.LiveFlowView afterReveal = mechanicsService.getLiveFlow(fixture.session().getId());
        assertThat(afterReveal.currentIndex()).isEqualTo(2);
        assertThat(liveStageService.state(fixture.session().getId()).primary().type())
                .isEqualTo(LiveStageType.WORD_CLOUD);
    }

    @Test
    void navigationAtBoundsDoesNotAdvanceAutomatically() {
        Fixture fixture = fixture();
        mechanicsService.setArenaSource(fixture.session().getId(), fixture.activity().getId());

        MechanicsService.LiveFlowResult started = mechanicsService.startLiveFlow(fixture.session().getId());
        MechanicsService.LiveFlowResult stillFirst = mechanicsService.previousLiveFlow(fixture.session().getId());

        assertThat(stillFirst.liveFlow().currentIndex()).isEqualTo(started.liveFlow().currentIndex());

        mechanicsService.nextLiveFlow(fixture.session().getId());
        mechanicsService.nextLiveFlow(fixture.session().getId());
        MechanicsService.LiveFlowResult last = mechanicsService.nextLiveFlow(fixture.session().getId());
        MechanicsService.LiveFlowResult stillLast = mechanicsService.nextLiveFlow(fixture.session().getId());

        assertThat(last.liveFlow().currentIndex()).isEqualTo(3);
        assertThat(stillLast.liveFlow().currentIndex()).isEqualTo(3);
        assertThat(stillLast.liveFlow().hasNext()).isFalse();
    }

    @Test
    void runtimeSurvivesAReadAfterNavigation() {
        Fixture fixture = fixture();
        mechanicsService.setArenaSource(fixture.session().getId(), fixture.activity().getId());
        mechanicsService.startLiveFlow(fixture.session().getId());
        mechanicsService.nextLiveFlow(fixture.session().getId());

        MechanicsService.LiveFlowView reloaded = mechanicsService.getLiveFlow(fixture.session().getId());
        MechanicsService.RuntimeView runtime = mechanicsService.getRuntime(fixture.session().getId());

        assertThat(reloaded.currentIndex()).isEqualTo(1);
        assertThat(runtime.currentStepId()).isNotNull();
        assertThat(runtime.currentStepPosition()).isEqualTo(1);
        assertThat(liveStageService.state(fixture.session().getId()).primary().type())
                .isEqualTo(LiveStageType.QUESTION);
    }

    private Fixture fixture() {
        Classroom classroom = classroomRepository.save(
                new Classroom("Desenvolvimento de Sistemas", "FLOW-01")
        );

        Activity activity = new Activity(classroom, "Aula de APIs");

        ActivityQuestion question = new ActivityQuestion(
                QuestionType.OPEN,
                "O que é uma API?",
                QuestionDifficulty.INTERMEDIATE,
                10,
                0
        );
        activity.addQuestion(question);
        activityRepository.saveAndFlush(activity);

        activityStepService.replace(
                activity.getId(),
                List.of(
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.SLIDE,
                                "Abertura",
                                "Apresente o contexto.",
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
                                question.getId(),
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
                                        "Uma palavra sobre API",
                                        1,
                                        false
                                ),
                                null
                        ),
                        new ActivityStepService.StepInput(
                                null,
                                ActivityStepType.POLL,
                                "Checagem",
                                null,
                                null,
                                null,
                                null,
                                new ActivityStepService.PollConfigInput(
                                        "Qual verbo HTTP usamos para leitura?",
                                        List.of(
                                                new ActivityStepService.PollOptionInput("A", "GET"),
                                                new ActivityStepService.PollOptionInput("B", "DELETE")
                                        ),
                                        false
                                )
                        )
                )
        );

        Activity refreshed = activityRepository.findById(activity.getId()).orElseThrow();
        ClassSession session = sessionRepository.save(new ClassSession(classroom, "Aula ao vivo"));

        return new Fixture(refreshed, question, session);
    }

    private record Fixture(
            Activity activity,
            ActivityQuestion question,
            ClassSession session
    ) {}
}
