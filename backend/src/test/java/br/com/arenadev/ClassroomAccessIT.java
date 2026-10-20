package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
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

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * v0.11.0-rc.5: classroom access on a shared LAN. Requests reach the backend
 * through the Next.js proxy (loopback/Compose), which forwards the real client
 * in X-Forwarded-For; limits apply per client, not per proxy.
 */
@Testcontainers
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.teacher.username=access-teacher",
                "app.teacher.password=access-password",
                "app.teacher.session-timeout-minutes=240"
        }
)
class ClassroomAccessIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_access_test")
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

    @Test
    void studentFailuresDoNotLockTheTeacherOutThroughTheSharedProxy() throws Exception {
        HttpClient student = cookieClient();
        String studentCsrf = csrf(student);
        for (int attempt = 0; attempt < 5; attempt++) {
            var failed = send(student, "POST", "/api/auth/login",
                    "{\"username\":\"access-teacher\",\"password\":\"wrong\"}", studentCsrf, "192.168.10.21");
            assertThat(failed.statusCode()).isEqualTo(401);
        }
        var blocked = send(student, "POST", "/api/auth/login",
                "{\"username\":\"access-teacher\",\"password\":\"wrong\"}", studentCsrf, "192.168.10.21");
        assertThat(blocked.statusCode()).isEqualTo(429);

        HttpClient teacher = cookieClient();
        var login = send(teacher, "POST", "/api/auth/login",
                "{\"username\":\"access-teacher\",\"password\":\"access-password\"}", csrf(teacher), "192.168.10.5");
        assertThat(login.statusCode()).isEqualTo(200);
    }

    @Test
    void teacherChoosesTheSessionDuration() throws Exception {
        HttpClient teacher = cookieClient();
        String csrf = csrf(teacher);
        var login = send(teacher, "POST", "/api/auth/login",
                "{\"username\":\"access-teacher\",\"password\":\"access-password\"}", csrf, "192.168.10.6");
        assertThat(login.statusCode()).isEqualTo(200);
        csrf = csrf(teacher);

        var initial = send(teacher, "GET", "/api/teacher/preferences", null, null, null);
        assertThat(initial.statusCode()).isEqualTo(200);
        assertThat(initial.body()).contains("\"sessionTimeoutMinutes\":240");

        var updated = send(teacher, "PUT", "/api/teacher/preferences", "{\"sessionTimeoutMinutes\":120}", csrf, null);
        assertThat(updated.statusCode()).isEqualTo(200);
        assertThat(send(teacher, "GET", "/api/teacher/preferences", null, null, null).body())
                .contains("\"sessionTimeoutMinutes\":120");

        var tooShort = send(teacher, "PUT", "/api/teacher/preferences", "{\"sessionTimeoutMinutes\":10}", csrf, null);
        assertThat(tooShort.statusCode()).isEqualTo(400);
    }

    @Test
    void joinAnswersUnknownAndAmbiguousIdentitiesTheSameWayAndLimitsGuessing() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Acesso " + suffix, "AC" + suffix);
        var first = studentService.create("AC1-" + suffix, "Maria Souza", null);
        var second = studentService.create("AC2-" + suffix, "Maria Souza", null);
        classroomService.enroll(classroom.id(), first.id());
        classroomService.enroll(classroom.id(), second.id());
        var session = sessionService.start(classroom.id(), "Aula Acesso", Set.of(first.id(), second.id()));
        String code = joinService.ensureCode(session.id()).code();

        HttpClient phone = HttpClient.newHttpClient();
        var unknown = send(phone, "POST", "/api/join/" + code, "{\"identity\":\"Pedro Lima\",\"rememberDevice\":false}", null, "192.168.10.30");
        var ambiguous = send(phone, "POST", "/api/join/" + code, "{\"identity\":\"Maria Souza\",\"rememberDevice\":false}", null, "192.168.10.30");
        assertThat(unknown.statusCode()).isEqualTo(ambiguous.statusCode());
        assertThat(unknown.body()).contains("Não encontramos você nesta turma");
        assertThat(ambiguous.body()).contains("Não encontramos você nesta turma");

        for (int attempt = 0; attempt < 8; attempt++) {
            send(phone, "POST", "/api/join/" + code, "{\"identity\":\"Tentativa " + attempt + "\",\"rememberDevice\":false}", null, "192.168.10.30");
        }
        var limited = send(phone, "POST", "/api/join/" + code, "{\"identity\":\"Outra\",\"rememberDevice\":false}", null, "192.168.10.30");
        assertThat(limited.statusCode()).isEqualTo(429);

        var classmate = send(phone, "POST", "/api/join/" + code,
                "{\"identity\":\"AC1-" + suffix + "\",\"rememberDevice\":false}", null, "192.168.10.31");
        assertThat(classmate.statusCode()).isEqualTo(200);
    }

    private static HttpClient cookieClient() {
        CookieManager cookies = new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        return HttpClient.newBuilder().cookieHandler(cookies).build();
    }

    private String csrf(HttpClient client) throws Exception {
        var response = send(client, "GET", "/api/auth/csrf", null, null, null);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
    }

    private HttpResponse<String> send(
            HttpClient client, String method, String path, String body, String csrf, String forwardedFor
    ) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json");
        if (csrf != null) request.header("X-XSRF-TOKEN", csrf);
        if (forwardedFor != null) request.header("X-Forwarded-For", forwardedFor);
        HttpRequest.BodyPublisher publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body);
        return client.send(request.method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
    }
}
