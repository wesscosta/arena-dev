package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.timer.SessionTimerService;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProjectorAccessIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ProjectorAccessIT.class);
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

    @Test
    void projectorQrIsPublicAndEncodesOnlyTheJoinUrlForTheShownCode() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma QR " + suffix, "QR" + suffix);
        var session = sessionService.start(classroom.id(), "Aula com QR", Set.of());
        var code = joinService.ensureCode(session.id());
        HttpClient client = HttpClient.newHttpClient();

        HttpResponse<byte[]> qr = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/projector/" + code.code()
                        + "/qr?baseUrl=" + URLEncoder.encode("http://192.168.0.10:3000/", StandardCharsets.UTF_8)))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofByteArray()
        );
        assertThat(qr.statusCode()).isEqualTo(200);
        assertThat(qr.headers().firstValue("Content-Type")).hasValue("image/png");
        var image = ImageIO.read(new ByteArrayInputStream(qr.body()));
        String decoded = new QRCodeReader()
                .decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image))))
                .getText();
        assertThat(decoded).isEqualTo("http://192.168.0.10:3000/join?code=" + code.code());

        HttpResponse<String> unsafeBase = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/projector/" + code.code()
                        + "/qr?baseUrl=" + URLEncoder.encode("javascript:alert(1)", StandardCharsets.UTF_8)))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofString()
        );
        assertThat(unsafeBase.statusCode()).isEqualTo(400);

        HttpResponse<String> unknownCode = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/projector/ZZZZZZ/qr?baseUrl="
                        + URLEncoder.encode("http://192.168.0.10:3000", StandardCharsets.UTF_8))).GET().build(),
                HttpResponse.BodyHandlers.ofString()
        );
        assertThat(unknownCode.statusCode()).isNotEqualTo(200);
    }
}
