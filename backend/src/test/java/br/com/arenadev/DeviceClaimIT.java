package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class DeviceClaimIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_device_claim_test")
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
    @Autowired private SessionJoinService joinService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void remembersEnrollmentWithOpaqueClaimButIssuesSessionSpecificParticipantToken() {
        Scenario scenario = scenario("Jota");

        SessionJoinService.JoinResultView first = joinService.join(
                scenario.joinCode(),
                scenario.registration(),
                true
        );

        assertThat(first.deviceToken()).isNotBlank();
        assertThat(first.deviceToken()).doesNotContain(scenario.registration());
        assertThat(first.access().displayName()).isEqualTo("Jota");
        assertThat(first.access().token()).isNotEqualTo(first.deviceToken());

        String storedHash = jdbcTemplate.queryForObject(
                """
                select claim.token_hash
                from enrollment_device_claims claim
                join enrollments enrollment on enrollment.id = claim.enrollment_id
                join students student on student.id = enrollment.student_id
                where student.registration = ?
                """,
                String.class,
                scenario.registration()
        );
        assertThat(storedHash).hasSize(64).isNotEqualTo(first.deviceToken());

        joinService.markConnected(scenario.sessionId(), first.access().token());
        joinService.markDisconnected(scenario.sessionId(), first.access().token());

        SessionJoinService.DeviceRecognitionView recognized = joinService.recognizeDevice(
                scenario.joinCode(),
                first.deviceToken()
        );
        assertThat(recognized.displayName()).isEqualTo("Jota");

        SessionJoinService.JoinAccessView replacement = joinService.joinRememberedDevice(
                scenario.joinCode(),
                first.deviceToken()
        );
        assertThat(replacement.token()).isNotEqualTo(first.access().token());
        assertThat(replacement.displayName()).isEqualTo("Jota");
        assertThat(joinService.validateParticipantToken(scenario.sessionId(), replacement.token()).getId())
                .isEqualTo(replacement.participantId());
        assertThatThrownBy(() -> joinService.validateParticipantToken(scenario.sessionId(), first.access().token()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Token de participante inválido.");
    }

    @Test
    void revokedClaimCannotRecognizeOrRejoin() {
        Scenario scenario = scenario("Jota");
        SessionJoinService.JoinResultView joined = joinService.join(
                scenario.joinCode(),
                scenario.registration(),
                true
        );

        joinService.revokeDevice(joined.deviceToken());

        assertThatThrownBy(() -> joinService.recognizeDevice(scenario.joinCode(), joined.deviceToken()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Dispositivo não reconhecido para esta turma.");
    }

    @Test
    void claimFromAnotherClassroomDoesNotRevealIdentity() {
        Scenario first = scenario("Jota");
        Scenario second = scenario("Nina");
        SessionJoinService.JoinResultView joined = joinService.join(first.joinCode(), first.registration(), true);

        assertThatThrownBy(() -> joinService.recognizeDevice(second.joinCode(), joined.deviceToken()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Dispositivo não reconhecido para esta turma.");
    }

    @Test
    void optOutDoesNotCreatePersistentClaim() {
        Scenario scenario = scenario(null);
        SessionJoinService.JoinResultView joined = joinService.join(
                scenario.joinCode(),
                scenario.registration(),
                false
        );

        assertThat(joined.deviceToken()).isNull();
        assertThat(joined.deviceExpiresAt()).isNull();
    }

    private Scenario scenario(String preferredName) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Device " + suffix, "DV" + suffix);
        String registration = "DV-" + suffix;
        var student = studentService.create(registration, "Aluno " + suffix, null);
        classroomService.enroll(classroom.id(), student.id());
        if (preferredName != null) {
            classroomService.updatePreferredName(classroom.id(), student.id(), preferredName);
        }
        var session = sessionService.start(classroom.id(), "Aula Device", Set.of(student.id()));
        String joinCode = joinService.ensureCode(session.id()).code();
        return new Scenario(session.id(), registration, joinCode);
    }

    private record Scenario(UUID sessionId, String registration, String joinCode) {}
}
