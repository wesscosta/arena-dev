package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.poll.PollService;
import br.com.arenadev.realtime.BuzzerService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.sessionevent.SessionEventActor;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.wordcloud.WordCloudService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class SessionEventIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_session_event_test")
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
    @Autowired private SessionEventService sessionEventService;
    @Autowired private PollService pollService;
    @Autowired private WordCloudService wordCloudService;
    @Autowired private SessionTimerService timerService;
    @Autowired private BuzzerService buzzerService;
    @Autowired private MechanicsService mechanicsService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void capturesHighLevelOperationalTimelineWithoutPerResponseNoise() {
        Fixture fixture = fixture();
        UUID sessionId = fixture.sessionId();
        UUID participantId = sessionService.participants(sessionId).getFirst().id();

        PollService.StateView poll = pollService.create(
                sessionId,
                new PollService.CreateCommand("Qual caminho seguir?", List.of("A", "B"), false)
        );
        pollService.vote(sessionId, participantId, poll.round().options().getFirst().id());
        pollService.reveal(sessionId, poll.round().id());
        pollService.close(sessionId, poll.round().id());

        WordCloudService.StateView cloud = wordCloudService.create(
                sessionId,
                new WordCloudService.CreateCommand("Defina API", false, 2)
        );
        wordCloudService.submit(sessionId, participantId, List.of("contrato"));
        wordCloudService.reveal(sessionId, cloud.round().id());
        wordCloudService.close(sessionId, cloud.round().id());

        var timer = timerService.create(
                sessionId,
                new SessionTimerService.CreateTimer("Discussão", null, 120)
        );
        timerService.start(sessionId, timer.id());
        timerService.pause(sessionId, timer.id());
        timerService.resume(sessionId, timer.id());
        timerService.finish(sessionId, timer.id());

        buzzerService.open(sessionId);
        buzzerService.close(sessionId);
        mechanicsService.draw(sessionId);
        sessionService.finish(sessionId);

        List<SessionEventType> types = sessionEventService.listBySession(sessionId)
                .stream()
                .map(SessionEventService.SessionEventView::eventType)
                .toList();

        assertThat(types).containsExactly(
                SessionEventType.SESSION_STARTED,
                SessionEventType.POLL_OPENED,
                SessionEventType.POLL_REVEALED,
                SessionEventType.POLL_CLOSED,
                SessionEventType.WORD_CLOUD_OPENED,
                SessionEventType.WORD_CLOUD_REVEALED,
                SessionEventType.WORD_CLOUD_CLOSED,
                SessionEventType.TIMER_STARTED,
                SessionEventType.TIMER_PAUSED,
                SessionEventType.TIMER_RESUMED,
                SessionEventType.TIMER_FINISHED,
                SessionEventType.BUZZER_OPENED,
                SessionEventType.BUZZER_CLOSED,
                SessionEventType.DRAW_COMPLETED,
                SessionEventType.SESSION_FINISHED
        );

        assertThat(types).doesNotContainNull();
        assertThat(sessionEventService.listBySession(sessionId))
                .extracting(SessionEventService.SessionEventView::sequenceNo)
                .isSorted();
    }

    @Test
    void listsClassroomTimelineMostRecentFirstWithBoundedLimit() {
        Fixture fixture = fixture();
        UUID sessionId = fixture.sessionId();

        buzzerService.open(sessionId);
        buzzerService.close(sessionId);

        var recent = sessionEventService.listByClassroom(fixture.classroomId(), 2);

        assertThat(recent).hasSize(2);
        assertThat(recent.get(0).sequenceNo()).isGreaterThan(recent.get(1).sequenceNo());
        assertThat(recent)
                .extracting(SessionEventService.SessionEventView::eventType)
                .containsExactly(SessionEventType.BUZZER_CLOSED, SessionEventType.BUZZER_OPENED);
    }


    @Test
    void recordsNaturalTimerExpirationOnceAsSystemEvent() {
        Fixture fixture = fixture();
        UUID sessionId = fixture.sessionId();

        var timer = timerService.create(
                sessionId,
                new SessionTimerService.CreateTimer("Tempo automático", null, 60)
        );
        timerService.start(sessionId, timer.id());
        jdbcTemplate.update(
                "update session_timers set ends_at = now() - interval '1 second' where id = ?",
                timer.id()
        );

        timerService.state(sessionId);
        timerService.state(sessionId);

        var finished = sessionEventService.listBySession(sessionId).stream()
                .filter(event -> event.eventType() == SessionEventType.TIMER_FINISHED)
                .toList();

        assertThat(finished).hasSize(1);
        assertThat(finished.getFirst().actor()).isEqualTo(SessionEventActor.SYSTEM);
        assertThat(finished.getFirst().payload()).containsEntry("reason", "ELAPSED");
    }

    @Test
    void reopeningBuzzerClosesThePreviousRoundInTheTimeline() {
        Fixture fixture = fixture();
        UUID sessionId = fixture.sessionId();

        buzzerService.open(sessionId);
        buzzerService.open(sessionId);

        assertThat(sessionEventService.listBySession(sessionId))
                .extracting(SessionEventService.SessionEventView::eventType)
                .containsExactly(
                        SessionEventType.SESSION_STARTED,
                        SessionEventType.BUZZER_OPENED,
                        SessionEventType.BUZZER_CLOSED,
                        SessionEventType.BUZZER_OPENED
                );
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Timeline " + suffix, "TL" + suffix);
        var student = studentService.create("REG-" + suffix, "Ana Timeline " + suffix, "Ana");
        classroomService.enroll(classroom.id(), student.id());
        var session = sessionService.start(
                classroom.id(),
                "Aula Timeline",
                Set.of(student.id())
        );
        return new Fixture(classroom.id(), session.id());
    }

    private record Fixture(UUID classroomId, UUID sessionId) {}
}
