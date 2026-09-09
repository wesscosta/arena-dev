package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.stage.LiveStageAudience;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.stage.LiveStageType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class LiveStageIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_live_stage_test")
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
    @Autowired private MechanicsService mechanicsService;
    @Autowired private LiveStageService liveStageService;

    @Test
    void startsIdleAndPersistsOnlyOneAuthoritativePrimaryStage() {
        Scenario scenario = scenario("Jota");

        LiveStageService.StateView initial = liveStageService.state(scenario.sessionId());
        assertThat(initial.primary().type()).isEqualTo(LiveStageType.IDLE);
        assertThat(initial.overlays().timer()).isTrue();

        liveStageService.activate(
                scenario.sessionId(),
                new LiveStageService.ActivateCommand(
                        LiveStageType.BOSS_BATTLE,
                        null,
                        LiveStageAudience.BOTH,
                        true
                )
        );
        liveStageService.activate(
                scenario.sessionId(),
                new LiveStageService.ActivateCommand(
                        LiveStageType.TIMER,
                        null,
                        LiveStageAudience.PROJECTOR,
                        false
                )
        );

        LiveStageService.StateView reloaded = liveStageService.state(scenario.sessionId());
        assertThat(reloaded.primary().type()).isEqualTo(LiveStageType.TIMER);
        assertThat(reloaded.audience()).isEqualTo(LiveStageAudience.PROJECTOR);
        assertThat(reloaded.overlays().timer()).isFalse();
    }

    @Test
    void drawProjectsResolvedDisplayNameWithoutLeakingStudentId() {
        Scenario scenario = scenario("Jota");

        MechanicsService.DrawResult result = mechanicsService.draw(scenario.sessionId());

        assertThat(result.studentId()).isEqualTo(scenario.studentId());

        LiveStageService.StateView teacher = liveStageService.state(scenario.sessionId());
        assertThat(teacher.primary().type()).isEqualTo(LiveStageType.DRAW);
        assertThat(teacher.primary().sourceId()).isEqualTo(scenario.studentId());
        assertThat(teacher.primary().displayName()).isEqualTo("Jota");

        LiveStageService.StateView projector = liveStageService.projectorState(scenario.sessionId());
        assertThat(projector.primary().type()).isEqualTo(LiveStageType.DRAW);
        assertThat(projector.primary().sourceId()).isNull();
        assertThat(projector.primary().displayName()).isEqualTo("Jota");
    }

    @Test
    void enrollmentPreferredNameOverridesLegacyNicknameOnlyInClassroomContext() {
        Scenario scenario = scenario("GlobalNick");
        classroomService.updatePreferredName(scenario.classroomId(), scenario.studentId(), "Jota da Turma");

        mechanicsService.draw(scenario.sessionId());

        var enrollment = classroomService.students(scenario.classroomId(), true).getFirst();
        assertThat(enrollment.name()).startsWith("João Otaviano");
        assertThat(enrollment.nickname()).isEqualTo("GlobalNick");
        assertThat(enrollment.preferredName()).isEqualTo("Jota da Turma");
        assertThat(liveStageService.projectorState(scenario.sessionId()).primary().displayName())
                .isEqualTo("Jota da Turma");
    }

    @Test
    void audiencePolicyProducesDifferentViewsFromTheSameStoredState() {
        Scenario scenario = scenario(null);

        liveStageService.activate(
                scenario.sessionId(),
                new LiveStageService.ActivateCommand(
                        LiveStageType.TIMER,
                        null,
                        LiveStageAudience.PROJECTOR,
                        true
                )
        );

        assertThat(liveStageService.projectorState(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.TIMER);
        assertThat(liveStageService.participantState(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.IDLE);
        assertThat(liveStageService.state(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.TIMER);
    }

    @Test
    void bossBattleUsesTheSharedStageAdapter() {
        Scenario scenario = scenario(null);

        mechanicsService.startBoss(scenario.sessionId(), "Null Pointer", 100);

        assertThat(liveStageService.state(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.BOSS_BATTLE);
        assertThat(liveStageService.projectorState(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.BOSS_BATTLE);
        assertThat(liveStageService.participantState(scenario.sessionId()).primary().type())
                .isEqualTo(LiveStageType.BOSS_BATTLE);
    }

    private Scenario scenario(String nickname) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Stage " + suffix, "ST" + suffix);
        var student = studentService.create(
                "ST-" + suffix,
                "João Otaviano " + suffix,
                nickname
        );
        classroomService.enroll(classroom.id(), student.id());
        var session = sessionService.start(
                classroom.id(),
                "Aula Stage",
                Set.of(student.id())
        );
        return new Scenario(classroom.id(), session.id(), student.id());
    }

    private record Scenario(UUID classroomId, UUID sessionId, UUID studentId) {}
}
