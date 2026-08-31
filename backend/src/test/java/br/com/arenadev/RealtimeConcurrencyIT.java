package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.realtime.BuzzerService;
import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Testcontainers
@SpringBootTest
class RealtimeConcurrencyIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_realtime_test")
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
    private StudentService studentService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionJoinService joinService;

    @Autowired
    private BuzzerService buzzerService;

    @Autowired
    private SessionRealtimeGateway realtimeGateway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void allowsOnlyOneConcurrentDeviceClaimForTheSameParticipant() throws Exception {
        Fixture fixture = createFixture(1);
        String registration = fixture.students().getFirst().registration();

        List<Callable<SessionJoinService.JoinAccessView>> claims = List.of(
                () -> joinService.join(fixture.joinCode(), registration),
                () -> joinService.join(fixture.joinCode(), registration)
        );
        List<Outcome<SessionJoinService.JoinAccessView>> outcomes = runConcurrently(claims);

        var successful = outcomes.stream().filter(Outcome::succeeded).toList();
        var failed = outcomes.stream().filter(outcome -> !outcome.succeeded()).toList();

        assertThat(successful).hasSize(1);
        assertThat(failed).hasSize(1);
        assertThat(failed.getFirst().error())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Este aluno já possui um dispositivo conectado. Peça ao professor para liberar o dispositivo antes de entrar novamente.");
        var access = successful.getFirst().value();
        assertThat(joinService.validateParticipantToken(fixture.sessionId(), access.token()).getId())
                .isEqualTo(access.participantId());

        joinService.markConnected(fixture.sessionId(), access.token());
        joinService.markDisconnected(fixture.sessionId(), access.token());
        assertThat(joinService.validateParticipantToken(fixture.sessionId(), access.token()).getId())
                .isEqualTo(access.participantId());

        joinService.releaseDevice(fixture.sessionId(), access.participantId());
        var replacement = joinService.join(fixture.joinCode(), registration);
        assertThat(replacement.token()).isNotEqualTo(access.token());
    }

    @Test
    void keepsAtMostOneOpenBuzzerRoundWhenOpenRequestsRace() throws Exception {
        Fixture fixture = createFixture(1);

        var outcomes = runConcurrently(List.of(
                () -> buzzerService.open(fixture.sessionId()),
                () -> buzzerService.open(fixture.sessionId())
        ));
        Integer openRounds = jdbcTemplate.queryForObject(
                "select count(*) from buzzer_rounds where session_id = ? and status = 'OPEN'",
                Integer.class,
                fixture.sessionId()
        );

        assertThat(outcomes.stream().filter(Outcome::succeeded).count()).isGreaterThanOrEqualTo(1);
        assertThat(outcomes.stream()
                .map(Outcome::error)
                .filter(error -> error != null)
                .allMatch(DataIntegrityViolationException.class::isInstance)).isTrue();
        assertThat(openRounds).isEqualTo(1);
    }

    @Test
    void acceptsOnlyOnePressWhenTheSameParticipantClicksConcurrently() throws Exception {
        Fixture fixture = createFixture(1);
        String token = joinService.join(
                fixture.joinCode(),
                fixture.students().getFirst().registration()
        ).token();
        buzzerService.open(fixture.sessionId());

        var outcomes = runConcurrently(List.of(
                () -> buzzerService.press(fixture.sessionId(), token),
                () -> buzzerService.press(fixture.sessionId(), token)
        ));
        var state = buzzerService.state(fixture.sessionId());

        assertThat(outcomes).allMatch(Outcome::succeeded);
        assertThat(state.presses()).hasSize(1);
        assertThat(state.presses().getFirst().position()).isEqualTo(1);
    }

    @Test
    void assignsUniqueOfficialPositionsToConcurrentParticipants() throws Exception {
        Fixture fixture = createFixture(4);
        List<String> tokens = fixture.students().stream()
                .map(student -> joinService.join(fixture.joinCode(), student.registration()).token())
                .toList();
        buzzerService.open(fixture.sessionId());

        List<Callable<BuzzerService.BuzzerStateView>> presses = tokens.stream()
                .<Callable<BuzzerService.BuzzerStateView>>map(token ->
                        () -> buzzerService.press(fixture.sessionId(), token))
                .toList();
        var outcomes = runConcurrently(presses);
        var state = buzzerService.state(fixture.sessionId());

        assertThat(outcomes).allMatch(Outcome::succeeded);
        assertThat(state.presses()).hasSize(4);
        assertThat(state.presses())
                .extracting(BuzzerService.BuzzerPressView::position)
                .containsExactly(1, 2, 3, 4);
        assertThat(state.presses())
                .extracting(BuzzerService.BuzzerPressView::participantId)
                .doesNotHaveDuplicates();
    }

    @Test
    void publishesRealtimeEventsOnlyAfterCommitAndDiscardsThemOnRollback() throws Exception {
        UUID sessionId = UUID.randomUUID();
        AtomicInteger committedMessages = new AtomicInteger();
        WebSocketSession committedSocket = recordingSocket(committedMessages);
        realtimeGateway.register(sessionId, committedSocket);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            realtimeGateway.broadcastAfterCommit(sessionId, "TEST_COMMIT", java.util.Map.of("value", 1));
            assertThat(committedMessages).hasValue(0);
        });

        assertThat(committedMessages).hasValue(1);
        realtimeGateway.unregister(sessionId, committedSocket);

        AtomicInteger rolledBackMessages = new AtomicInteger();
        WebSocketSession rolledBackSocket = recordingSocket(rolledBackMessages);
        realtimeGateway.register(sessionId, rolledBackSocket);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            realtimeGateway.broadcastAfterCommit(sessionId, "TEST_ROLLBACK", java.util.Map.of("value", 2));
            status.setRollbackOnly();
        });

        assertThat(rolledBackMessages).hasValue(0);
        realtimeGateway.unregister(sessionId, rolledBackSocket);
    }

    private WebSocketSession recordingSocket(AtomicInteger messages) throws Exception {
        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.isOpen()).thenReturn(true);
        doAnswer(invocation -> {
            messages.incrementAndGet();
            return null;
        }).when(socket).sendMessage(any(TextMessage.class));
        return socket;
    }

    private Fixture createFixture(int studentCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma realtime " + suffix, "R" + suffix);
        List<StudentService.StudentView> students = new ArrayList<>();
        for (int index = 1; index <= studentCount; index++) {
            var student = studentService.create(
                    suffix + index,
                    "Aluno " + index + " " + suffix,
                    "Aluno " + index
            );
            classroomService.enroll(classroom.id(), student.id());
            students.add(student);
        }
        Set<UUID> presentStudentIds = students.stream()
                .map(StudentService.StudentView::id)
                .collect(java.util.stream.Collectors.toSet());
        var session = sessionService.start(classroom.id(), "Aula realtime", presentStudentIds);
        String joinCode = joinService.ensureCode(session.id()).code();
        return new Fixture(classroom.id(), session.id(), joinCode, List.copyOf(students));
    }

    private <T> List<Outcome<T>> runConcurrently(List<Callable<T>> actions) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(actions.size());
        CountDownLatch ready = new CountDownLatch(actions.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Outcome<T>>> futures = actions.stream()
                    .map(action -> executor.submit(() -> {
                        ready.countDown();
                        if (!start.await(5, TimeUnit.SECONDS)) {
                            return new Outcome<T>(null, new TimeoutException("As tarefas não iniciaram juntas."));
                        }
                        try {
                            return new Outcome<>(action.call(), null);
                        } catch (Throwable error) {
                            return new Outcome<T>(null, error);
                        }
                    }))
                    .toList();

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<Outcome<T>> outcomes = new ArrayList<>();
            for (Future<Outcome<T>> future : futures) {
                outcomes.add(future.get(20, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            executor.shutdownNow();
        }
    }

    private record Fixture(
            UUID classroomId,
            UUID sessionId,
            String joinCode,
            List<StudentService.StudentView> students
    ) {
    }

    private record Outcome<T>(T value, Throwable error) {
        boolean succeeded() {
            return error == null;
        }
    }
}
