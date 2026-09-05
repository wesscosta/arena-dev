package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.timer.TimerStatus;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class SessionTimerIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_timer_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private ClassroomService classroomService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionTimerService timerService;

    @Test
    void runsTheTimerLifecycleWithPauseExtensionResumeAndFinish() {
        UUID sessionId = createActiveSession();

        var created = timerService.create(sessionId, new SessionTimerService.CreateTimer(
                "Pesquisa OSI x TCP/IP",
                "Preparar uma síntese para apresentação.",
                300
        ));

        assertThat(created.status()).isEqualTo(TimerStatus.READY);
        assertThat(created.remainingSeconds()).isEqualTo(300);

        var running = timerService.start(sessionId, created.id());
        assertThat(running.status()).isEqualTo(TimerStatus.RUNNING);
        assertThat(running.startedAt()).isNotNull();
        assertThat(running.endsAt()).isNotNull();
        assertThat(running.remainingSeconds()).isBetween(299, 300);

        var paused = timerService.pause(sessionId, created.id());
        assertThat(paused.status()).isEqualTo(TimerStatus.PAUSED);
        assertThat(paused.pausedAt()).isNotNull();
        assertThat(paused.endsAt()).isNull();

        int pausedRemaining = paused.remainingSeconds();
        var extended = timerService.extend(sessionId, created.id(), 60);

        assertThat(extended.durationSeconds()).isEqualTo(360);
        assertThat(extended.remainingSeconds()).isEqualTo(pausedRemaining + 60);

        var resumed = timerService.resume(sessionId, created.id());
        assertThat(resumed.status()).isEqualTo(TimerStatus.RUNNING);
        assertThat(resumed.endsAt()).isNotNull();

        var finished = timerService.finish(sessionId, created.id());
        assertThat(finished.status()).isEqualTo(TimerStatus.FINISHED);
        assertThat(finished.remainingSeconds()).isZero();
        assertThat(finished.finishedAt()).isNotNull();
    }

    @Test
    void allowsOnlyOneOpenTimerPerSessionAndReleasesTheSlotAfterCancel() {
        UUID sessionId = createActiveSession();

        var first = timerService.create(sessionId, new SessionTimerService.CreateTimer(
                "Primeiro timer",
                null,
                120
        ));

        assertThatThrownBy(() -> timerService.create(
                sessionId,
                new SessionTimerService.CreateTimer("Segundo timer", null, 60)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Já existe um timer ativo para esta sessão.");

        timerService.cancel(sessionId, first.id());

        var second = timerService.create(sessionId, new SessionTimerService.CreateTimer(
                "Segundo timer",
                null,
                60
        ));

        assertThat(second.status()).isEqualTo(TimerStatus.READY);
    }

    @Test
    void cancelsAnOpenTimerWhenTheClassSessionFinishes() {
        UUID sessionId = createActiveSession();

        var timer = timerService.create(sessionId, new SessionTimerService.CreateTimer(
                "Atividade prática",
                null,
                600
        ));

        timerService.start(sessionId, timer.id());
        sessionService.finish(sessionId);

        var persisted = timerService.get(sessionId, timer.id());

        assertThat(persisted.status()).isEqualTo(TimerStatus.CANCELLED);
        assertThat(persisted.finishedAt()).isNotNull();
    }

    @Test
    void rejectsInvalidDurationsAndChangesAfterTheSessionIsFinished() {
        UUID sessionId = createActiveSession();

        assertThatThrownBy(() -> timerService.create(
                sessionId,
                new SessionTimerService.CreateTimer("Inválido", null, 0)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A duração do timer deve estar entre 1 segundo e 24 horas.");

        var timer = timerService.create(sessionId, new SessionTimerService.CreateTimer(
                "Timer válido",
                null,
                60
        ));

        sessionService.finish(sessionId);

        assertThatThrownBy(() -> timerService.start(sessionId, timer.id()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Sessão não está ativa.");
    }

    private UUID createActiveSession() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Timer " + suffix, "TM" + suffix);
        return sessionService.start(classroom.id(), "Aula com timer", Set.of()).id();
    }
}
