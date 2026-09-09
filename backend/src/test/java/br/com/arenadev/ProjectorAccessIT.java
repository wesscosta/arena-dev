package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.timer.SessionTimerService;
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
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProjectorAccessIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_projector_test")
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
    private ClassroomService classroomService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionJoinService joinService;

    @Autowired
    private SessionTimerService timerService;

    @Autowired
    private MechanicsService mechanicsService;

    @Test
    void exposesOnlySafeReadOnlyProjectionStateToAnonymousClients() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Projetor " + suffix, "PJ" + suffix);
        var session = sessionService.start(classroom.id(), "Aula pública", Set.of());
        var code = joinService.ensureCode(session.id());
        var timer = timerService.create(
                session.id(),
                new SessionTimerService.CreateTimer(
                        "Pesquisa em grupo",
                        "Preparem uma síntese.",
                        600
                )
        );
        mechanicsService.startBoss(session.id(), "Spaghetti Code", 100);
        mechanicsService.damageBoss(session.id(), 30);

        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> projector = client.send(
                HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + "/api/projector/" + code.code())
                ).GET().build(),
                HttpResponse.BodyHandlers.ofString()
        );
        HttpResponse<String> administrativeTimer = client.send(
                HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + "/api/sessions/" + session.id() + "/timers")
                ).GET().build(),
                HttpResponse.BodyHandlers.ofString()
        );

        assertThat(projector.statusCode()).isEqualTo(200);
        assertThat(projector.body())
                .contains("\"sessionId\":\"" + session.id() + "\"")
                .contains("\"sessionTitle\":\"Aula pública\"")
                .contains("\"code\":\"" + code.code() + "\"")
                .contains("\"id\":\"" + timer.id() + "\"")
                .contains("\"status\":\"READY\"")
                .contains("\"boss\":{\"name\":\"Spaghetti Code\",\"maxHp\":100,\"currentHp\":70}")
                .doesNotContain("participantId")
                .doesNotContain("studentId")
                .doesNotContain("registration");

        assertThat(administrativeTimer.statusCode()).isEqualTo(401);
    }
}
