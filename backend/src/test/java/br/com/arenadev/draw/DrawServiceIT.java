package br.com.arenadev.draw;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreEventRepository;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
@SpringBootTest
class DrawServiceIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_draw_v010_test").withUsername("arena_test").withPassword("arena_test");
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username",POSTGRES::getUsername);
        registry.add("spring.datasource.password",POSTGRES::getPassword);
    }
    @Autowired ClassroomService classrooms;
    @Autowired StudentService students;
    @Autowired SessionService sessions;
    @Autowired DrawService draws;
    @Autowired MechanicsService legacy;
    @Autowired SessionEventService audit;
    @Autowired ScoreEventRepository scoreEvents;
    @Autowired ScoreEventService scoreService;

    @Test
    void legacyAndModernProtocolsCannotInterleaveWithinOneSession() {
        String suffix=UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("Protocol Gate " + suffix,"PG" + suffix);
        var student=students.create("PG-"+suffix,"Estudante Protocol",null);
        classrooms.enroll(classroom.id(),student.id());
        var first=sessions.start(classroom.id(),"Turma com sorteio antigo",Set.of(student.id()));
        legacy.draw(first.id());
        assertThatThrownBy(()->draws.state(first.id()))
                .isInstanceOf(DrawConflictException.class);
        assertThatThrownBy(()->draws.select(first.id(),UUID.randomUUID()))
                .isInstanceOf(DrawConflictException.class)
                .hasMessageContaining("sorteio antigo");
        assertThatThrownBy(()->draws.setPolicy(first.id(),DrawPolicy.BALANCED_WEIGHTED))
                .isInstanceOf(DrawConflictException.class);
        sessions.finish(first.id());
        var next=sessions.start(classroom.id(),"Turma com sorteio novo",Set.of(student.id()));
        var selected=draws.select(next.id(),UUID.randomUUID());
        assertThatThrownBy(()->legacy.draw(next.id()))
                .isInstanceOf(DrawConflictException.class)
                .hasMessageContaining("Atualize a página");
        draws.resolve(next.id(),selected.attemptId(),UUID.randomUUID(),DrawOutcome.PASSED,null);
        assertThat(audit.listBySession(next.id()).stream().map(event->event.eventType()))
                .contains(SessionEventType.DRAW_SELECTED, SessionEventType.DRAW_RESOLVED);
        assertThat(audit.listBySession(next.id()).stream()
                .filter(event->event.eventType()==SessionEventType.DRAW_RESOLVED)
                .map(event->event.payload().get("outcome"))).containsExactly("PASSED");
    }

    @Test
    void concurrentSelectionOnlyCreatesOnePendingAttempt() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("Concurrent Draw " + suffix,"CD" + suffix);
        var student=students.create("CON-"+suffix,"Aluna simultânea",null);
        classrooms.enroll(classroom.id(),student.id());
        var session=sessions.start(classroom.id(),"Aula concorrência",Set.of(student.id()));
        CountDownLatch gate=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var a=executor.submit(()->{ gate.await(); try {return draws.select(session.id(),UUID.randomUUID());}
                catch(DrawConflictException rejected) {return null;} });
            var b=executor.submit(()->{ gate.await(); try {return draws.select(session.id(),UUID.randomUUID());}
                catch(DrawConflictException rejected) {return null;} });
            gate.countDown();
            var first=a.get(15,TimeUnit.SECONDS);
            var second=b.get(15,TimeUnit.SECONDS);
            assertThat((first==null?0:1)+(second==null?0:1)).isEqualTo(1);
            var state=draws.state(session.id());
            assertThat(state.history()).hasSize(1);
            assertThat(state.currentAttempt()).isNotNull();
        }
    }

    @Test
    void noReplacementUntilFullRoundAndOutcomesAndXpAreIdempotent() {
        String suffix=UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("Draw IT " + suffix,"DR" + suffix);
        Set<UUID> ids=new HashSet<>();
        for(int i=1;i<=3;i++) {
            var student=students.create("DRAW-"+suffix+"-"+i,"Aluno " + i,null);
            classrooms.enroll(classroom.id(),student.id()); ids.add(student.id());
        }
        var session=sessions.start(classroom.id(),"Sorteio seguro",ids);
        assertThat(draws.state(session.id()).policy()).isEqualTo(DrawPolicy.ROUND_ROBIN_SHUFFLED);
        UUID request=UUID.randomUUID();
        var first=draws.select(session.id(),request);
        assertThat(draws.select(session.id(),request).attemptId()).isEqualTo(first.attemptId());
        assertThatThrownBy(()->draws.select(session.id(),UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);
        UUID resolution=UUID.randomUUID();
        var score=new DrawService.ScoreCommand(5,ScoreCategory.COLLABORATION,"Participação");
        var confirmed=draws.resolve(session.id(),first.attemptId(),resolution,DrawOutcome.CONFIRMED,score);
        assertThat(confirmed.scoreEventId()).isNotNull();
        assertThat(confirmed.scoreReversed()).isFalse();
        assertThat(draws.resolve(session.id(),first.attemptId(),resolution,DrawOutcome.CONFIRMED,score).scoreEventId())
                .isEqualTo(confirmed.scoreEventId());
        assertThat(scoreEvents.findBySessionIdOrderByCreatedAtAsc(session.id())).hasSize(1);
        var correction=scoreService.reverse(confirmed.scoreEventId(),UUID.randomUUID());
        assertThat(correction.points()).isEqualTo(-5);
        assertThat(draws.state(session.id()).history().getFirst().scoreReversed()).isTrue();
        assertThat(draws.state(session.id()).history().getFirst().status()).isEqualTo(DrawOutcome.CONFIRMED);
        assertThat(audit.listBySession(session.id()).stream().map(e->e.eventType()))
                .contains(SessionEventType.SCORE_EVENT_REVERSED);
        assertThatThrownBy(()->draws.resolve(session.id(),first.attemptId(),resolution,DrawOutcome.PASSED,null))
                .isInstanceOf(IllegalArgumentException.class);

        var second=draws.select(session.id(),UUID.randomUUID());
        assertThat(second.studentId()).isNotEqualTo(first.studentId());
        draws.resolve(session.id(),second.attemptId(),UUID.randomUUID(),DrawOutcome.PASSED,null);
        var third=draws.select(session.id(),UUID.randomUUID());
        assertThat(third.studentId()).isNotIn(first.studentId(),second.studentId());
        draws.resolve(session.id(),third.attemptId(),UUID.randomUUID(),DrawOutcome.CONFIRMED,null);
        assertThat(draws.state(session.id()).calledUniqueCount()).isEqualTo(3);
        assertThat(draws.state(session.id()).confirmedCount()).isEqualTo(2);
        assertThat(draws.state(session.id()).passedCount()).isEqualTo(1);
        assertThat(draws.state(session.id()).canStartNextRound()).isTrue();
        assertThatThrownBy(()->draws.select(session.id(),UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);
        draws.nextRound(session.id(),UUID.randomUUID());
        assertThat(draws.state(session.id()).roundNumber()).isEqualTo(2);
        var fourth=draws.select(session.id(),UUID.randomUUID());
        draws.resolve(session.id(),fourth.attemptId(),UUID.randomUUID(),DrawOutcome.VOIDED,null);
        assertThat(draws.state(session.id()).calledUniqueCount()).isZero();
        assertThat(draws.state(session.id()).voidedCount()).isEqualTo(1);
        assertThat(scoreEvents.findBySessionIdOrderByCreatedAtAsc(session.id())).hasSize(2);
        draws.setPolicy(session.id(),DrawPolicy.BALANCED_WEIGHTED);
        assertThat(draws.state(session.id()).policy()).isEqualTo(DrawPolicy.BALANCED_WEIGHTED);
        var balanced=draws.select(session.id(),UUID.randomUUID());
        assertThat(ids).contains(balanced.studentId());
    }
}
