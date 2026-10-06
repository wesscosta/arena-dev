package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.journey.JourneyCompletionRule;
import br.com.arenadev.journey.JourneyItemType;
import br.com.arenadev.journey.JourneyService;
import br.com.arenadev.journey.JourneyUnlockRule;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.teacher.username=resource-teacher",
                "app.teacher.password=resource-password"
        }
)
class LearningResourceHttpIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_resource_test")
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
    private ClassroomService classrooms;

    @Autowired
    private JourneyService journeys;
    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    private HttpClient client;
    private String csrfToken;

    @BeforeEach
    void authenticate() throws Exception {
        CookieManager cookies = new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        client = HttpClient.newBuilder().cookieHandler(cookies).build();
        csrfToken = csrf();
        HttpResponse<String> login = send(
                "POST",
                "/api/auth/login",
                "{\"username\":\"resource-teacher\",\"password\":\"resource-password\"}",
                true
        );
        assertThat(login.statusCode()).isEqualTo(200);
    }

    @Test
    void learningResourceCrudIsAvailableThroughTheProtectedHttpApi() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Recursos " + suffix, "LR" + suffix).id();

        HttpResponse<String> create = send(
                "POST",
                "/api/learning-resources",
                """
                {"classroomId":"%s","title":"HTTP e Web","summary":"Base da web","body":"Conteúdo inicial","format":"MARKDOWN","sourceType":"MANUAL"}
                """.formatted(classroomId),
                true
        );
        assertThat(create.statusCode()).isEqualTo(201);
        assertThat(create.body()).contains("\"title\":\"HTTP e Web\"");
        String resourceId = create.body().replaceFirst(".*\\\"id\\\":\\\"([^\\\"]+)\\\".*", "$1");
        assertThat(resourceId).matches("[0-9a-f-]{36}");

        HttpResponse<String> get = send("GET", "/api/learning-resources/" + resourceId, null, false);
        assertThat(get.statusCode()).isEqualTo(200);
        assertThat(get.body()).contains("\"summary\":\"Base da web\"");

        HttpResponse<String> list = send("GET", "/api/learning-resources?classroomId=" + classroomId, null, false);
        assertThat(list.statusCode()).isEqualTo(200);
        assertThat(list.body()).contains(resourceId, "HTTP e Web");

        HttpResponse<String> update = send(
                "PUT",
                "/api/learning-resources/" + resourceId,
                """
                {"classroomId":"%s","title":"HTTP, Web e APIs","summary":"Revisado","body":"Conteúdo revisado","format":"PLAIN_TEXT","sourceType":"MANUAL"}
                """.formatted(classroomId),
                true
        );
        assertThat(update.statusCode()).isEqualTo(200);
        assertThat(update.body()).contains("\"title\":\"HTTP, Web e APIs\"", "\"format\":\"PLAIN_TEXT\"");

        HttpResponse<String> delete = send("DELETE", "/api/learning-resources/" + resourceId, null, true);
        assertThat(delete.statusCode()).isEqualTo(204);

        HttpResponse<String> missing = send("GET", "/api/learning-resources/" + resourceId, null, false);
        assertThat(missing.statusCode()).isEqualTo(404);
    }

    @Test
    void refusesToDeleteAResourceReferencedByAJourney() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Recursos usados " + suffix, "LRU" + suffix).id();

        HttpResponse<String> create = send(
                "POST",
                "/api/learning-resources",
                """
                {"classroomId":"%s","title":"REST","body":"Arquitetura de APIs","format":"MARKDOWN","sourceType":"MANUAL"}
                """.formatted(classroomId),
                true
        );
        String resourceId = create.body().replaceFirst(".*\\\"id\\\":\\\"([^\\\"]+)\\\".*", "$1");

        journeys.create(new JourneyService.JourneyInput(
                classroomId,
                "Jornada protegida",
                null,
                java.util.List.of(new JourneyService.StageInput(
                        null,
                        "REST",
                        null,
                        null,
                        JourneyUnlockRule.IMMEDIATE,
                        JourneyCompletionRule.MANUAL,
                        null,
                        "Fundamentos",
                        JourneyItemType.CONTENT,
                        UUID.fromString(resourceId)
                ))
        ));

        HttpResponse<String> delete = send("DELETE", "/api/learning-resources/" + resourceId, null, true);
        assertThat(delete.statusCode()).isEqualTo(409);
        assertThat(delete.body()).contains("vinculado a uma jornada");
    }

    @Test
    void libraryResourceCanBeReusedAcrossClassroomsWithoutMutatingJourneySnapshot() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Biblioteca " + suffix, "LIB" + suffix).id();
        HttpResponse<String> create = send("POST", "/api/library/resources",
                "{\"title\":\"Python — Variáveis\",\"body\":\"Versão 1\",\"format\":\"MARKDOWN\",\"sourceType\":\"MANUAL\"}", true);
        assertThat(create.statusCode()).isEqualTo(201);
        assertThat(create.body()).contains("\"libraryVisible\":true", "\"revision\":1", "\"classroomId\":null");
        String resourceId = create.body().replaceFirst(".*\\\"id\\\":\\\"([^\\\"]+)\\\".*", "$1");

        var journey = journeys.create(new JourneyService.JourneyInput(classroomId, "Jornada com Biblioteca", null,
                java.util.List.of(new JourneyService.StageInput(null, "Variáveis", null, null,
                        JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, null, "Fundamentos",
                        JourneyItemType.CONTENT, UUID.fromString(resourceId)))));
        HttpResponse<String> update = send("PUT", "/api/library/resources/" + resourceId,
                "{\"title\":\"Python — Variáveis\",\"body\":\"Versão 2\",\"format\":\"MARKDOWN\",\"sourceType\":\"MANUAL\"}", true);
        assertThat(update.statusCode()).isEqualTo(200);
        assertThat(update.body()).contains("\"revision\":2");

        String stageId = journey.stages().getFirst().id().toString();
        journeys.update(journey.id(), new JourneyService.JourneyInput(
                classroomId,
                "Jornada com Biblioteca — título revisado",
                "Alteração estrutural sem rematerialização",
                java.util.List.of(new JourneyService.StageInput(
                        stageId, "Variáveis revisadas", "Descrição revisada", null,
                        JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, null, "Fundamentos",
                        JourneyItemType.CONTENT, UUID.fromString(resourceId)
                ))
        ));

        String snapshot = jdbc.queryForObject(
                "select resource_snapshot_body from journey_stages where journey_id = ?",
                String.class, journey.id());
        Integer snapshotRevision = jdbc.queryForObject(
                "select resource_snapshot_revision from journey_stages where journey_id = ?",
                Integer.class, journey.id());
        assertThat(snapshot).isEqualTo("Versão 1");
        assertThat(snapshotRevision).isEqualTo(1);

        assertThat(send("GET", "/api/library/resources?q=Variáveis", null, false).body()).contains(resourceId);
        assertThat(send("GET", "/api/library/resources?q=Inexistente", null, false).body()).doesNotContain(resourceId);

        assertThat(send("POST", "/api/library/resources/" + resourceId + "/archive", "{}", true).statusCode()).isEqualTo(204);
        assertThat(send("GET", "/api/library/resources", null, false).body()).doesNotContain(resourceId);
        assertThat(send("GET", "/api/library/resources?archived=true", null, false).body()).contains(resourceId);

        journeys.update(journey.id(), new JourneyService.JourneyInput(
                classroomId,
                "Jornada ainda válida com origem arquivada",
                null,
                java.util.List.of(new JourneyService.StageInput(
                        stageId, "Variáveis revisadas", null, null,
                        JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL, null, "Fundamentos",
                        JourneyItemType.CONTENT, UUID.fromString(resourceId)
                ))
        ));
        assertThat(jdbc.queryForObject(
                "select resource_snapshot_revision from journey_stages where journey_id = ?",
                Integer.class, journey.id())).isEqualTo(1);

        HttpResponse<String> restore = send("POST", "/api/library/resources/" + resourceId + "/restore", "{}", true);
        assertThat(restore.statusCode()).isEqualTo(200);
        assertThat(restore.body()).contains("\"libraryVisible\":true", "\"archivedAt\":null");
        assertThat(send("GET", "/api/library/resources", null, false).body()).contains(resourceId);
    }

    @Test
    void semanticMetadataIsRevisionNeutralAndSnapshotRefreshIsExplicit() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Semântica " + suffix, "SEM" + suffix).id();

        HttpResponse<String> create = send(
                "POST",
                "/api/library/resources",
                """
                {"title":"SQL Essencial","summary":"Consultas básicas","body":"# SQL\\n## Consultas\\n### SELECT\\nConteúdo.","format":"MARKDOWN","sourceType":"MANUAL","subject":"Banco de Dados","tags":["SQL","SELECT"],"language":"pt-BR"}
                """,
                true
        );
        assertThat(create.statusCode()).isEqualTo(201);
        assertThat(create.body())
                .contains("\"subject\":\"Banco de Dados\"", "\"language\":\"pt-BR\"", "\"revision\":1")
                .contains("\"tags\":[\"SQL\",\"SELECT\"]")
                .contains("\"outlineParserVersion\":\"arena-outline-v1\"");
        String resourceId = create.body().replaceFirst(".*\\\"id\\\":\\\"([^\\\"]+)\\\".*", "$1");

        HttpResponse<String> metadataOnly = send(
                "PUT",
                "/api/library/resources/" + resourceId,
                """
                {"title":"SQL Essencial","summary":"Consultas básicas","body":"# SQL\\n## Consultas\\n### SELECT\\nConteúdo.","format":"MARKDOWN","sourceType":"MANUAL","subject":"Banco de Dados Relacional","tags":["SQL","SELECT","WHERE"],"language":"pt-BR"}
                """,
                true
        );
        assertThat(metadataOnly.statusCode()).isEqualTo(200);
        assertThat(metadataOnly.body())
                .contains("\"revision\":1", "\"subject\":\"Banco de Dados Relacional\"", "WHERE");

        var journey = journeys.create(new JourneyService.JourneyInput(
                classroomId,
                "Jornada SQL",
                null,
                java.util.List.of(new JourneyService.StageInput(
                        null, "SQL", null, null,
                        JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL,
                        null, "Banco de Dados", JourneyItemType.CONTENT, UUID.fromString(resourceId)
                ))
        ));
        String stageId = journey.stages().getFirst().id().toString();

        HttpResponse<String> contentUpdate = send(
                "PUT",
                "/api/library/resources/" + resourceId,
                """
                {"title":"SQL Essencial","summary":"Consultas básicas","body":"# SQL\\n## Consultas\\n### SELECT\\nConteúdo revisado.","format":"MARKDOWN","sourceType":"MANUAL","subject":"Banco de Dados Relacional","tags":["SQL","SELECT","WHERE"],"language":"pt-BR"}
                """,
                true
        );
        assertThat(contentUpdate.body()).contains("\"revision\":2");

        HttpResponse<String> usage = send(
                "GET",
                "/api/library/resources/" + resourceId + "/usage",
                null,
                false
        );
        assertThat(usage.statusCode()).isEqualTo(200);
        assertThat(usage.body())
                .contains("\"snapshotRevision\":1", "\"currentRevision\":2", "\"updateAvailable\":true", "\"refreshAllowed\":true");

        HttpResponse<String> refresh = send(
                "POST",
                "/api/journeys/" + journey.id() + "/stages/" + stageId + "/refresh-resource",
                "{}",
                true
        );
        assertThat(refresh.statusCode()).isEqualTo(200);
        assertThat(refresh.body())
                .contains("\"resourceSnapshotRevision\":2", "\"resourceCurrentRevision\":2", "\"resourceUpdateAvailable\":false");

        assertThat(send("GET", "/api/library/resources?subject=Banco%20de%20Dados%20Relacional&tag=WHERE&language=pt-BR", null, false).body())
                .contains(resourceId);
        assertThat(send("GET", "/api/library/resources/facets", null, false).body())
                .contains("Banco de Dados Relacional", "WHERE", "pt-BR");
    }

    @Test
    void administrativeResourceApiRequiresTeacherAuthentication() throws Exception {
        HttpClient anonymous = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/learning-resources?classroomId=" + UUID.randomUUID()))
                .GET()
                .build();
        HttpResponse<String> response = anonymous.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(401);
    }

    private String csrf() throws Exception {
        HttpResponse<String> response = send("GET", "/api/auth/csrf", null, false);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
    }

    private HttpResponse<String> send(String method, String path, String body, boolean csrf) throws Exception {
        HttpRequest.BodyPublisher publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body);
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json");
        if (csrf && csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        return client.send(request.method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
    }
}
