package br.com.arenadev;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.teacher.username=test-teacher",
                "app.teacher.password=test-password",
                "spring.jpa.properties.hibernate.format_sql=false"
        }
)
class SecurityAndMigrationIT {
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

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private HttpClient anonymousClient;
    private HttpClient sessionClient;

    @BeforeEach
    void createHttpClients() {
        anonymousClient = HttpClient.newHttpClient();

        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        sessionClient = HttpClient.newBuilder()
                .cookieHandler(cookieManager)
                .build();
    }

    @Test
    void appliesEveryMigrationAndValidatesTheOperationalSchema() {
        List<String> versions = jdbcTemplate.queryForList(
                "select version from flyway_schema_history where success order by installed_rank",
                String.class
        );
        Integer expectedTables = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'classrooms',
                    'students',
                    'enrollments',
                    'class_sessions',
                    'session_participants',
                    'score_events',
                    'activities',
                    'activity_questions',
                    'session_dynamics',
                    'group_history',
                    'external_result_imports',
                    'external_result_rows',
                    'session_join_codes',
                    'buzzer_rounds',
                    'buzzer_presses',
                    'session_timers',
                    'word_cloud_rounds',
                    'word_cloud_submissions'
                  )
                """, Integer.class);

        assertThat(versions).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9");
        assertThat(expectedTables).isEqualTo(18);
    }

    @Test
    void keepsHealthPublicAndAdministrativeApisProtected() throws Exception {
        HttpResponse<String> health = send(anonymousClient, "GET", "/api/health", null);
        HttpResponse<String> classrooms = send(anonymousClient, "GET", "/api/classrooms", null);

        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("\"status\":\"UP\"");
        assertThat(health.body()).contains("\"database\":\"UP\"");
        assertThat(classrooms.statusCode()).isEqualTo(401);
    }

    @Test
    void authenticatesTeacherPersistsSessionAndInvalidatesItOnLogout() throws Exception {
        String csrfToken = csrfToken(sessionClient);
        HttpResponse<String> login = send(
                sessionClient,
                "POST",
                "/api/auth/login",
                "{\"username\":\"test-teacher\",\"password\":\"test-password\"}",
                csrfToken
        );
        HttpResponse<String> session = send(sessionClient, "GET", "/api/auth/session", null);
        HttpResponse<String> createClassroom = send(
                sessionClient,
                "POST",
                "/api/classrooms",
                "{\"name\":\"Turma de integração\",\"code\":\"test-11-3\"}",
                csrfToken
        );
        HttpResponse<String> logout = send(sessionClient, "POST", "/api/auth/logout", "", csrfToken);
        HttpResponse<String> afterLogout = send(sessionClient, "GET", "/api/auth/session", null);

        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.body()).contains("\"username\":\"test-teacher\"");
        assertThat(login.body()).contains("\"role\":\"TEACHER\"");
        assertThat(session.statusCode()).isEqualTo(200);
        assertThat(createClassroom.statusCode()).isEqualTo(201);
        assertThat(createClassroom.body()).contains("\"code\":\"TEST-11-3\"");
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(afterLogout.statusCode()).isEqualTo(401);
    }

    @Test
    void rejectsInvalidTeacherCredentialsWithoutLeakingDetails() throws Exception {
        String csrfToken = csrfToken(sessionClient);
        HttpResponse<String> response = send(
                sessionClient,
                "POST",
                "/api/auth/login",
                "{\"username\":\"test-teacher\",\"password\":\"wrong-password\"}",
                csrfToken
        );

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.body()).contains("\"message\":\"Usuário ou senha inválidos.\"");
    }

    @Test
    void rejectsUnsafeTeacherRequestWithoutCsrfToken() throws Exception {
        HttpResponse<String> response = send(
                anonymousClient,
                "POST",
                "/api/auth/login",
                "{\"username\":\"test-teacher\",\"password\":\"test-password\"}"
        );

        assertThat(response.statusCode()).isEqualTo(403);
    }

    private String csrfToken(HttpClient client) throws IOException, InterruptedException {
        HttpResponse<String> response = send(client, "GET", "/api/auth/csrf", null);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String body)
            throws IOException, InterruptedException {
        return send(client, method, path, body, null);
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String body, String csrfToken)
            throws IOException, InterruptedException {
        HttpRequest.BodyPublisher publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body);
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json");
        if (csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        return client.send(request.method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
    }
}
