package br.com.arenadev.scoring;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionService;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
@SpringBootTest
class ManualScoreIdempotencyIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_manual_score_test").withUsername("arena_test").withPassword("arena_test");
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
    @Autowired ClassroomService classrooms;
    @Autowired StudentService students;
    @Autowired SessionService sessions;
    @Autowired ScoreEventService scores;
    @Autowired ScoreEventRepository events;

    private Fixture fixture() {
        String marker = UUID.randomUUID().toString().substring(0, 7).toUpperCase();
        var classroom = classrooms.create("Idempotencia " + marker, "ID" + marker);
        var student = students.create("ID-" + marker, "Aluno Idempotente", null);
        classrooms.enroll(classroom.id(), student.id());
        var session = sessions.start(classroom.id(), "XP em rede incerta", Set.of(student.id()));
        return new Fixture(classroom.id(), student.id(), session.id());
    }
    private record Fixture(UUID classroomId, UUID studentId, UUID sessionId) {
        ScoreEventService.CreateScoreEvent request(UUID id, int points) {
            return new ScoreEventService.CreateScoreEvent(classroomId, studentId, sessionId,
                    points, ScoreCategory.BONUS, "Participacao", ScoreSource.ARENA, null, null, id);
        }
    }

    @Test
    void retryAfterLostResponseReturnsTheSamePersistedEventWithoutDoublingXp() {
        var fx = fixture();
        var key = UUID.randomUUID();
        var first = scores.create(fx.request(key, 10));
        var repeated = scores.create(fx.request(key, 10));
        assertThat(repeated.id()).isEqualTo(first.id());
        assertThat(events.findBySessionIdOrderByCreatedAtAsc(fx.sessionId())).hasSize(1);
        assertThat(events.findByCreateRequestId(key)).isPresent();
    }

    @Test
    void sameKeyWithDifferentPayloadReturnsConflictAndDoesNotCreateXp() {
        var fx = fixture();
        var key = UUID.randomUUID();
        scores.create(fx.request(key, 5));
        assertThatThrownBy(() -> scores.create(fx.request(key, 20)))
                .isInstanceOf(ScoreConflictException.class)
                .hasMessageContaining("diferentes");
        assertThat(events.findBySessionIdOrderByCreatedAtAsc(fx.sessionId())).hasSize(1);
    }

    @Test
    void concurrentEqualRequestsSerializeOnPostgresAndReturnOneEvent() throws Exception {
        var fx = fixture();
        var key = UUID.randomUUID();
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { gate.await(); return scores.create(fx.request(key, 7)); });
            var b = executor.submit(() -> { gate.await(); return scores.create(fx.request(key, 7)); });
            gate.countDown();
            assertThat(a.get(20, TimeUnit.SECONDS).id()).isEqualTo(b.get(20, TimeUnit.SECONDS).id());
        }
        assertThat(events.findBySessionIdOrderByCreatedAtAsc(fx.sessionId())).hasSize(1);
    }

    @Test
    void legacyClientsWithoutKeysRemainCompatibleButAreNotIdempotent() {
        var fx = fixture();
        var first = scores.create(fx.request(null, 3));
        var second = scores.create(fx.request(null, 3));
        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(events.findBySessionIdOrderByCreatedAtAsc(fx.sessionId())).hasSize(2);
    }
}
