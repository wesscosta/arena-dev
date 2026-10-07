package br.com.arenadev.interaction;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.learning.LearningTargetService;
import br.com.arenadev.learning.LearningTargetType;
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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class LearningCheckJoinIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_learning_check_join_test")
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
    @Autowired private LearningTargetService targetService;
    @Autowired private LearningCheckService checkService;

    @Test
    void participantAnswerSurvivesReconnectThroughPublicJoinProjection() throws Exception {
        Scenario scenario = scenario();
        var access = joinService.join(
                scenario.joinCode(),
                scenario.registration(),
                false
        ).access();

        HttpResponse<String> before = get(
                "/api/join/" + scenario.joinCode()
                        + "/learning-check?token="
                        + encode(access.token())
        );
        assertThat(before.statusCode()).isEqualTo(200);
        assertThat(before.body()).contains("\"answered\":false");

        HttpResponse<String> answer = post(
                "/api/join/" + scenario.joinCode()
                        + "/learning-check/" + scenario.runId() + "/answer",
                """
                {"token":"%s","optionKey":"b"}
                """.formatted(access.token())
        );
        assertThat(answer.statusCode()).isEqualTo(200);
        assertThat(answer.body()).contains("\"answered\":true");
        assertThat(answer.body()).contains("\"selectedOptionKey\":\"b\"");

        HttpResponse<String> reconnect = get(
                "/api/join/" + scenario.joinCode()
                        + "/learning-check?token="
                        + encode(access.token())
        );
        assertThat(reconnect.statusCode()).isEqualTo(200);
        assertThat(reconnect.body()).contains("\"answered\":true");
        assertThat(reconnect.body()).contains("\"selectedOptionKey\":\"b\"");
        assertThat(reconnect.body()).contains("\"acceptsResponses\":true");
    }

    private Scenario scenario() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String registration = "LCJ-" + suffix;
        var classroom = classroomService.create(
                "Turma Learning Check Join " + suffix,
                "LCJ" + suffix
        );
        var student = studentService.create(
                registration,
                "Aluno Learning Check Join " + suffix,
                null
        );
        classroomService.enroll(classroom.id(), student.id());

        var session = sessionService.start(
                classroom.id(),
                "Aula Learning Check Join",
                Set.of(student.id())
        );
        var joinCode = joinService.ensureCode(session.id());
        var target = targetService.create(new LearningTargetService.CreateCommand(
                "LEFT JOIN " + suffix,
                LearningTargetType.COMPETENCY,
                null
        ));

        var prepared = checkService.prepare(
                session.id(),
                new LearningCheckService.PrepareCommand(
                        target.id(),
                        "Qual JOIN preserva todas as linhas da tabela esquerda?",
                        List.of(
                                new LearningCheckService.OptionCommand("a", "INNER JOIN"),
                                new LearningCheckService.OptionCommand("b", "LEFT JOIN"),
                                new LearningCheckService.OptionCommand("c", "RIGHT JOIN")
                        ),
                        "b"
                )
        );
        checkService.open(session.id(), prepared.run().id());

        return new Scenario(
                registration,
                joinCode.code(),
                prepared.run().id()
        );
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path)
                )
                .GET()
                .build();
        return HttpClient.newHttpClient().send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path)
                )
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HttpClient.newHttpClient().send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record Scenario(
            String registration,
            String joinCode,
            UUID runId
    ) {}
}
