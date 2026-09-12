package br.com.arenadev;

import br.com.arenadev.activity.*;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.quiz.*;
import br.com.arenadev.scoring.*;
import br.com.arenadev.session.*;
import br.com.arenadev.sessionevent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class QuizScoringIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_quiz_scoring_test")
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
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private ActivityService activityService;
    @Autowired private QuizService quizService;
    @Autowired private ParticipantAnswerRepository answerRepository;
    @Autowired private ScoreEventService scoreEventService;
    @Autowired private SessionEventService sessionEventService;

    @Test
    void lockEvaluatesAnswersAwardsOnlyCorrectOnesAndRemainsIdempotent() {
        Scenario scenario = scenario(QuestionType.MULTIPLE_CHOICE, 10, 2);

        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        SessionParticipant correctParticipant = scenario.participants().get(0);
        SessionParticipant wrongParticipant = scenario.participants().get(1);

        quizService.answer(scenario.sessionId(), prepared.round().id(), correctParticipant.getId(), "a");
        quizService.answer(scenario.sessionId(), prepared.round().id(), wrongParticipant.getId(), "b");
        quizService.lock(scenario.sessionId(), prepared.round().id());

        List<ParticipantAnswer> answers =
                answerRepository.findByRoundIdOrderBySubmittedAtAsc(prepared.round().id());

        assertThat(answers).hasSize(2);
        assertThat(answers).allSatisfy(answer -> assertThat(answer.isEvaluated()).isTrue());

        ParticipantAnswer correct = answers.stream()
                .filter(answer -> answer.getParticipant().getId().equals(correctParticipant.getId()))
                .findFirst().orElseThrow();
        ParticipantAnswer wrong = answers.stream()
                .filter(answer -> answer.getParticipant().getId().equals(wrongParticipant.getId()))
                .findFirst().orElseThrow();

        assertThat(correct.isCorrect()).isTrue();
        assertThat(correct.getScoreEventId()).isNotNull();
        assertThat(wrong.isCorrect()).isFalse();
        assertThat(wrong.getScoreEventId()).isNull();

        List<ScoreEventService.ScoreEventView> firstLedger = scoreEventService.list(scenario.classroomId());
        assertThat(firstLedger)
                .filteredOn(event -> event.source() == ScoreSource.QUIZ)
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.studentId()).isEqualTo(correctParticipant.getStudent().getId());
                    assertThat(event.sessionId()).isEqualTo(scenario.sessionId());
                    assertThat(event.points()).isEqualTo(10);
                    assertThat(event.category()).isEqualTo(ScoreCategory.QUESTION);
                    assertThat(event.activityId()).isEqualTo(scenario.activityId().toString());
                    assertThat(event.questionId()).isEqualTo(scenario.questionId().toString());
                    assertThat(event.id()).isEqualTo(correct.getScoreEventId());
                });

        quizService.lock(scenario.sessionId(), prepared.round().id());
        assertThat(scoreEventService.list(scenario.classroomId()).stream()
                .filter(event -> event.source() == ScoreSource.QUIZ))
                .hasSize(1);

        ScoreEventService.ScoreEventView original = scoreEventService.list(scenario.classroomId()).stream()
                .filter(event -> event.source() == ScoreSource.QUIZ)
                .findFirst().orElseThrow();

        ScoreEventService.ScoreEventView reversal = scoreEventService.reverse(original.id());
        assertThat(reversal.points()).isEqualTo(-10);
        assertThat(reversal.reversalOf()).isEqualTo(original.id());
        assertThat(reversal.source()).isEqualTo(ScoreSource.QUIZ);

        int netQuizXp = scoreEventService.list(scenario.classroomId()).stream()
                .filter(event -> event.source() == ScoreSource.QUIZ)
                .mapToInt(ScoreEventService.ScoreEventView::points)
                .sum();
        assertThat(netQuizXp).isZero();
    }

    @Test
    void trueFalseUsesTheSameEvaluationPipeline() {
        Scenario scenario = scenario(QuestionType.TRUE_FALSE, 7, 1);
        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        SessionParticipant participant = scenario.participants().getFirst();
        quizService.answer(scenario.sessionId(), prepared.round().id(), participant.getId(), true);
        quizService.lock(scenario.sessionId(), prepared.round().id());

        ParticipantAnswer answer = answerRepository
                .findByRoundIdAndParticipantId(prepared.round().id(), participant.getId())
                .orElseThrow();
        assertThat(answer.isEvaluated()).isTrue();
        assertThat(answer.isCorrect()).isTrue();
        assertThat(answer.getScoreEventId()).isNotNull();

        assertThat(scoreEventService.list(scenario.classroomId()))
                .filteredOn(event -> event.source() == ScoreSource.QUIZ)
                .singleElement()
                .satisfies(event -> assertThat(event.points()).isEqualTo(7));
    }

    @Test
    void sessionTimelineRecordsQuizTransitionsButNeverIndividualAnswers() {
        Scenario scenario = scenario(QuestionType.MULTIPLE_CHOICE, 5, 2);
        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        for (SessionParticipant participant : scenario.participants()) {
            quizService.answer(scenario.sessionId(), prepared.round().id(), participant.getId(), "a");
        }

        quizService.lock(scenario.sessionId(), prepared.round().id());
        quizService.lock(scenario.sessionId(), prepared.round().id());
        quizService.reveal(scenario.sessionId(), prepared.round().id());
        quizService.close(scenario.sessionId(), prepared.round().id());

        List<SessionEventType> quizEvents = sessionEventService.listBySession(scenario.sessionId())
                .stream()
                .map(SessionEventService.SessionEventView::eventType)
                .filter(type -> type.name().startsWith("QUIZ_"))
                .collect(Collectors.toList());

        assertThat(quizEvents).containsExactly(
                SessionEventType.QUIZ_PREPARED,
                SessionEventType.QUIZ_OPENED,
                SessionEventType.QUIZ_LOCKED,
                SessionEventType.QUIZ_REVEALED,
                SessionEventType.QUIZ_CLOSED
        );
    }

    private Scenario scenario(QuestionType type, int points, int participantCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Quiz XP " + suffix, "QX" + suffix);

        ArrayList<UUID> studentIds = new ArrayList<>();
        for (int index = 1; index <= participantCount; index++) {
            var student = studentService.create(
                    "QXP-" + suffix + "-" + index,
                    "Aluno Quiz XP " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(classroom.id(), "Aula Quiz XP", Set.copyOf(studentIds));

        List<ActivityService.QuestionOptionInput> options = type == QuestionType.MULTIPLE_CHOICE
                ? List.of(
                        new ActivityService.QuestionOptionInput("a", "Alternativa A"),
                        new ActivityService.QuestionOptionInput("b", "Alternativa B"),
                        new ActivityService.QuestionOptionInput("c", "Alternativa C"),
                        new ActivityService.QuestionOptionInput("d", "Alternativa D")
                )
                : null;

        Object correctAnswer = type == QuestionType.TRUE_FALSE ? true : "a";

        ActivityService.ActivityView activity = activityService.create(new ActivityService.ActivityInput(
                classroom.id(),
                "Atividade Quiz XP " + suffix,
                "Avaliação automática",
                100,
                0,
                new ActivityService.ResourceInput(ActivityResourceKind.INTERNAL, null, null),
                List.of(new ActivityService.QuestionInput(
                        null,
                        type,
                        "Questão XP " + suffix,
                        QuestionDifficulty.EASY,
                        points,
                        options,
                        correctAnswer,
                        null,
                        "Explicação da resposta.",
                        null,
                        null,
                        null,
                        null
                ))
        ));

        UUID activityId = activity.id();
        UUID questionId = UUID.fromString(activity.questions().getFirst().id());
        List<SessionParticipant> participants =
                participantRepository.findBySessionIdOrderByStudentNameAsc(session.id());

        return new Scenario(classroom.id(), session.id(), activityId, questionId, participants);
    }

    private record Scenario(
            UUID classroomId,
            UUID sessionId,
            UUID activityId,
            UUID questionId,
            List<SessionParticipant> participants
    ) {}
}
