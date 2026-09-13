package br.com.arenadev;

import br.com.arenadev.activity.ActivityResourceKind;
import br.com.arenadev.activity.ActivityService;
import br.com.arenadev.activity.QuestionDifficulty;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.quiz.QuizService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class QuizJoinIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_quiz_join_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @LocalServerPort
    private int port;

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionJoinService joinService;
    @Autowired private ActivityService activityService;
    @Autowired private QuizService quizService;

    @Test
    void participantAnswersThroughPublicJoinRouteWithoutTeacherSessionOrCsrf() throws Exception {
        Scenario scenario = scenario();
        var prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        var access = joinService.join(scenario.code(), scenario.registration(), false).access();
        String body = """
                {"token":"%s","answer":"a"}
                """.formatted(access.token());

        HttpResponse<String> response = send(
                "/api/join/" + scenario.code() + "/quiz/" + prepared.round().id() + "/answer",
                body
        );

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"answered\":true");
        assertThat(response.body()).contains("\"answer\":\"a\"");
        assertThat(response.body()).contains("\"correctAnswer\":null");
        assertThat(quizService.state(scenario.sessionId()).round().totalAnswers()).isEqualTo(1);
    }

    @Test
    void participantCannotAnswerWithInvalidTemporaryToken() throws Exception {
        Scenario scenario = scenario();
        var prepared = quizService.prepare(scenario.sessionId(), scenario.questionId());
        quizService.open(scenario.sessionId(), prepared.round().id());

        HttpResponse<String> response = send(
                "/api/join/" + scenario.code() + "/quiz/" + prepared.round().id() + "/answer",
                """
                {"token":"invalid-participant-token","answer":"a"}
                """
        );

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(quizService.state(scenario.sessionId()).round().totalAnswers()).isZero();
    }

    private Scenario scenario() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String registration = "QJ-" + suffix;
        var classroom = classroomService.create("Turma Quiz Join " + suffix, "JQ" + suffix);
        var student = studentService.create(registration, "Aluno Quiz Join " + suffix, null);
        classroomService.enroll(classroom.id(), student.id());

        var session = sessionService.start(classroom.id(), "Aula Quiz Join", Set.of(student.id()));
        var joinCode = joinService.ensureCode(session.id());

        ActivityService.ActivityView activity = activityService.create(new ActivityService.ActivityInput(
                classroom.id(),
                "Atividade Quiz Join " + suffix,
                "Respostas estruturadas",
                100,
                0,
                new ActivityService.ResourceInput(ActivityResourceKind.INTERNAL, null, null),
                List.of(new ActivityService.QuestionInput(
                        null,
                        QuestionType.MULTIPLE_CHOICE,
                        "Qual alternativa?",
                        QuestionDifficulty.EASY,
                        10,
                        List.of(
                                new ActivityService.QuestionOptionInput("a", "Alternativa A"),
                                new ActivityService.QuestionOptionInput("b", "Alternativa B"),
                                new ActivityService.QuestionOptionInput("c", "Alternativa C"),
                                new ActivityService.QuestionOptionInput("d", "Alternativa D")
                        ),
                        "a",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ))
        ));

        UUID questionId = UUID.fromString(activity.questions().getFirst().id());
        return new Scenario(session.id(), questionId, joinCode.code(), registration);
    }

    private HttpResponse<String> send(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }

    private record Scenario(
            UUID sessionId,
            UUID questionId,
            String code,
            String registration
    ) {}
}
