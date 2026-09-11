package br.com.arenadev;

import br.com.arenadev.activity.*;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.quiz.QuizService;
import br.com.arenadev.quiz.QuizStatus;
import br.com.arenadev.session.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class QuizIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_quiz_test")
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

    @Test
    void supportsLifecycleAnswerChangesAndProtectedReveal() {
        Scenario scenario = scenario(QuestionType.MULTIPLE_CHOICE, 2);

        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        assertThat(prepared.round().status()).isEqualTo(QuizStatus.READY);
        assertThat(prepared.round().correctAnswer()).isEqualTo("a");
        assertThat(quizService.publicState(scenario.sessionId()).round().question()).isNull();

        QuizService.StateView opened = quizService.open(scenario.sessionId(), prepared.round().id());
        assertThat(opened.round().status()).isEqualTo(QuizStatus.OPEN);
        assertThat(quizService.publicState(scenario.sessionId()).round().question().statement())
                .contains("Questão MULTIPLE_CHOICE");

        UUID participantId = scenario.participants().getFirst().getId();
        QuizService.ParticipantStateView first = quizService.answer(
                scenario.sessionId(), prepared.round().id(), participantId, "b"
        );
        QuizService.ParticipantStateView changed = quizService.answer(
                scenario.sessionId(), prepared.round().id(), participantId, "a"
        );

        assertThat(first.answer()).isEqualTo("b");
        assertThat(changed.answer()).isEqualTo("a");
        assertThat(changed.answered()).isTrue();
        assertThat(changed.canAnswer()).isTrue();
        assertThat(quizService.state(scenario.sessionId()).round().totalAnswers()).isEqualTo(1);

        QuizService.StateView hidden = quizService.publicState(scenario.sessionId());
        assertThat(hidden.round().totalAnswers()).isEqualTo(1);
        assertThat(hidden.round().publicResultsVisible()).isFalse();
        assertThat(hidden.round().correctAnswer()).isNull();
        assertThat(hidden.round().distribution()).allSatisfy(item -> {
            assertThat(item.answerCount()).isNull();
            assertThat(item.percentage()).isNull();
        });

        quizService.lock(scenario.sessionId(), prepared.round().id());
        assertThatThrownBy(() -> quizService.answer(
                scenario.sessionId(), prepared.round().id(), participantId, "b"
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não está aceitando");

        quizService.reveal(scenario.sessionId(), prepared.round().id());
        QuizService.StateView revealed = quizService.publicState(scenario.sessionId());
        assertThat(revealed.round().publicResultsVisible()).isTrue();
        assertThat(revealed.round().correctAnswer()).isEqualTo("a");
        assertThat(revealed.round().distribution())
                .filteredOn(item -> item.optionId().equals("a"))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.answerCount()).isEqualTo(1);
                    assertThat(item.percentage()).isEqualTo(100d);
                });

        assertThat(quizService.close(scenario.sessionId(), prepared.round().id()).round().status())
                .isEqualTo(QuizStatus.CLOSED);
    }

    @Test
    void supportsTrueFalseWithoutDuplicatingAuthoringOptions() {
        Scenario scenario = scenario(QuestionType.TRUE_FALSE, 1);
        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        UUID participantId = scenario.participants().getFirst().getId();
        quizService.answer(scenario.sessionId(), prepared.round().id(), participantId, true);
        quizService.lock(scenario.sessionId(), prepared.round().id());
        quizService.reveal(scenario.sessionId(), prepared.round().id());

        QuizService.StateView publicState = quizService.publicState(scenario.sessionId());
        assertThat(publicState.round().correctAnswer()).isEqualTo(true);
        assertThat(publicState.round().question().options())
                .extracting(QuizService.QuestionOptionView::id)
                .containsExactly("true", "false");
        assertThat(publicState.round().distribution())
                .filteredOn(item -> item.optionId().equals("true"))
                .singleElement()
                .satisfies(item -> assertThat(item.answerCount()).isEqualTo(1));
    }

    @Test
    void rejectsUnsupportedQuestionsAndConcurrentCurrentRounds() {
        Scenario unsupported = scenario(QuestionType.OPEN, 1);
        assertThatThrownBy(() -> quizService.prepare(unsupported.sessionId(), unsupported.questionId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("múltipla escolha ou verdadeiro/falso");

        Scenario supported = scenario(QuestionType.MULTIPLE_CHOICE, 1);
        QuizService.StateView first = quizService.prepare(supported.sessionId(), supported.questionId());
        assertThat(first.round().status()).isEqualTo(QuizStatus.READY);

        UUID secondQuestion = createQuestion(
                supported.classroomId(),
                QuestionType.TRUE_FALSE,
                UUID.randomUUID().toString().substring(0, 8)
        );
        assertThatThrownBy(() -> quizService.prepare(supported.sessionId(), secondQuestion))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Já existe um Quiz");
    }

    @Test
    void sessionFinishClosesCurrentQuiz() {
        Scenario scenario = scenario(QuestionType.MULTIPLE_CHOICE, 1);
        QuizService.StateView prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        sessionService.finish(scenario.sessionId());

        assertThat(quizService.state(scenario.sessionId()).round().status()).isEqualTo(QuizStatus.CLOSED);
    }

    private Scenario scenario(QuestionType type, int participantCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Quiz " + suffix, "QZ" + suffix);

        ArrayList<UUID> studentIds = new ArrayList<>();
        for (int index = 1; index <= participantCount; index++) {
            var student = studentService.create(
                    "QZ-" + suffix + "-" + index,
                    "Aluno Quiz " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(classroom.id(), "Aula Quiz", Set.copyOf(studentIds));
        UUID questionId = createQuestion(classroom.id(), type, suffix);
        List<SessionParticipant> participants =
                participantRepository.findBySessionIdOrderByStudentNameAsc(session.id());

        return new Scenario(classroom.id(), session.id(), questionId, participants);
    }

    private UUID createQuestion(UUID classroomId, QuestionType type, String suffix) {
        List<ActivityService.QuestionOptionInput> options = type == QuestionType.MULTIPLE_CHOICE
                ? List.of(
                        new ActivityService.QuestionOptionInput("a", "Alternativa A"),
                        new ActivityService.QuestionOptionInput("b", "Alternativa B"),
                        new ActivityService.QuestionOptionInput("c", "Alternativa C"),
                        new ActivityService.QuestionOptionInput("d", "Alternativa D")
                )
                : null;

        Object answer = switch (type) {
            case MULTIPLE_CHOICE -> "a";
            case TRUE_FALSE -> true;
            default -> null;
        };

        ActivityService.ActivityView activity = activityService.create(new ActivityService.ActivityInput(
                classroomId,
                "Atividade Quiz " + suffix + " " + type,
                "E2E domínio Quiz",
                100,
                0,
                new ActivityService.ResourceInput(ActivityResourceKind.INTERNAL, null, null),
                List.of(new ActivityService.QuestionInput(
                        null,
                        type,
                        "Questão " + type + " " + suffix,
                        QuestionDifficulty.EASY,
                        10,
                        options,
                        answer,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ))
        ));

        return UUID.fromString(activity.questions().getFirst().id());
    }

    private record Scenario(
            UUID classroomId,
            UUID sessionId,
            UUID questionId,
            List<SessionParticipant> participants
    ) {}
}
