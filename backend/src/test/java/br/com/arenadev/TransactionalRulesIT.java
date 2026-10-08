package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreEventRepository;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.scoring.ScoreSource;
import br.com.arenadev.scoring.ScoreConflictException;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.session.SessionStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class TransactionalRulesIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_transactional_test")
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
    private ScoreEventService scoreEventService;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private ClassSessionRepository sessionRepository;

    @Autowired
    private ScoreEventRepository scoreEventRepository;
    @Autowired
    private SessionEventService sessionEvents;

    @Test
    void snapshotsParticipantsAndAllowsANewSessionOnlyAfterFinishingTheActiveOne() {
        Fixture fixture = createFixture();

        var firstSession = sessionService.start(
                fixture.classroomId(),
                "Aula de integração",
                Set.of(fixture.firstStudentId())
        );
        var participants = sessionService.participants(firstSession.id());

        assertThat(participants).hasSize(2);
        assertThat(participants)
                .filteredOn(SessionService.ParticipantView::present)
                .extracting(SessionService.ParticipantView::studentId)
                .containsExactly(fixture.firstStudentId());
        assertThat(participants)
                .filteredOn(participant -> !participant.present())
                .extracting(SessionService.ParticipantView::studentId)
                .containsExactly(fixture.secondStudentId());

        assertThatThrownBy(() -> sessionService.start(
                fixture.classroomId(),
                "Sessão duplicada",
                Set.of()
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Já existe uma sessão ativa para esta turma. Encerre-a antes de iniciar outra.");

        var finished = sessionService.finish(firstSession.id());
        var nextSession = sessionService.start(fixture.classroomId(), "Próxima aula", Set.of());

        assertThat(finished.status()).isEqualTo(SessionStatus.FINISHED);
        assertThat(finished.endedAt()).isNotNull();
        assertThat(nextSession.status()).isEqualTo(SessionStatus.ACTIVE);
    }

    @Test
    void enforcesOneActiveSessionPerClassroomAtDatabaseLevel() {
        Fixture fixture = createFixture();
        var classroom = classroomRepository.findById(fixture.classroomId()).orElseThrow();

        sessionRepository.saveAndFlush(new ClassSession(classroom, "Sessão persistida diretamente"));

        assertThatThrownBy(() -> sessionRepository.saveAndFlush(
                new ClassSession(classroom, "Segunda sessão ativa")
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void createsAndReversesScoreEventsWhileKeepingHistoryAndProjectedTotalConsistent() {
        Fixture fixture = createFixture();
        var session = sessionService.start(
                fixture.classroomId(),
                "Aula com XP",
                Set.of(fixture.firstStudentId())
        );

        var original = scoreEventService.create(new ScoreEventService.CreateScoreEvent(
                fixture.classroomId(),
                fixture.firstStudentId(),
                session.id(),
                15,
                ScoreCategory.QUESTION,
                "Resposta correta",
                ScoreSource.ARENA,
                null,
                null
        ));
        var reversal = scoreEventService.reverse(original.id());
        var events = scoreEventService.list(fixture.classroomId());

        var originalView = events.stream()
                .filter(event -> event.id().equals(original.id()))
                .findFirst()
                .orElseThrow();
        int projectedTotal = events.stream()
                .filter(event -> event.studentId().equals(fixture.firstStudentId()))
                .mapToInt(ScoreEventService.ScoreEventView::points)
                .sum();

        assertThat(events).hasSize(2);
        assertThat(scoreEventRepository.existsById(original.id())).isTrue();
        assertThat(originalView.reversed()).isTrue();
        assertThat(reversal.points()).isEqualTo(-15);
        assertThat(reversal.category()).isEqualTo(ScoreCategory.ADJUSTMENT);
        assertThat(reversal.source()).isEqualTo(ScoreSource.ARENA);
        assertThat(reversal.reversalOf()).isEqualTo(original.id());
        assertThat(projectedTotal).isZero();

        assertThatThrownBy(() -> scoreEventService.reverse(original.id()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Este lançamento já foi revertido.");
        assertThatThrownBy(() -> scoreEventService.reverse(reversal.id()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Um evento de reversão não pode ser revertido diretamente.");
    }

    @Test
    void scoreReversalRetriesAreIdempotentAndConcurrentCommandsCannotDuplicateXpOrAudit() throws Exception {
        Fixture fixture = createFixture();
        var session=sessionService.start(fixture.classroomId(),"Auditoria concorrente de XP",
                Set.of(fixture.firstStudentId()));
        var original=scoreEventService.create(new ScoreEventService.CreateScoreEvent(
                fixture.classroomId(),fixture.firstStudentId(),session.id(),20,
                ScoreCategory.QUESTION,"Verificação autoral",ScoreSource.ARENA,null,null));
        UUID commandId=UUID.randomUUID();
        CountDownLatch ready=new CountDownLatch(2);
        CountDownLatch go=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var first=executor.submit(()->{
                ready.countDown(); go.await(); return scoreEventService.reverse(original.id(),commandId);
            });
            var second=executor.submit(()->{
                ready.countDown(); go.await(); return scoreEventService.reverse(original.id(),commandId);
            });
            assertThat(ready.await(10,TimeUnit.SECONDS)).isTrue();
            go.countDown();
            var a=first.get(20,TimeUnit.SECONDS);
            var b=second.get(20,TimeUnit.SECONDS);
            assertThat(a.id()).isEqualTo(b.id());
            assertThat(a.reversalOf()).isEqualTo(original.id());
        }
        assertThat(scoreEventService.list(fixture.classroomId())).hasSize(2);
        assertThat(scoreEventService.list(fixture.classroomId()).stream().mapToInt(
                ScoreEventService.ScoreEventView::points).sum()).isZero();
        assertThat(sessionEvents.listBySession(session.id()).stream()
                .filter(e->e.eventType()==SessionEventType.SCORE_EVENT_REVERSED)).hasSize(1);
        assertThatThrownBy(()->scoreEventService.reverse(original.id(),UUID.randomUUID()))
                .isInstanceOf(ScoreConflictException.class);
        assertThat(scoreEventService.list(fixture.classroomId())).hasSize(2);
        assertThatThrownBy(()->scoreEventService.reverse(original.id()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Este lançamento já foi revertido.");
        assertThatThrownBy(()->scoreEventService.reverse(original.id(),null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rollsBackTheWholeScoreBatchWhenAnyCommandIsInvalid() {
        Fixture fixture = createFixture();
        var valid = new ScoreEventService.CreateScoreEvent(
                fixture.classroomId(),
                fixture.firstStudentId(),
                null,
                10,
                ScoreCategory.BONUS,
                "Bônus válido",
                ScoreSource.MANUAL,
                null,
                null
        );
        var invalid = new ScoreEventService.CreateScoreEvent(
                fixture.classroomId(),
                fixture.secondStudentId(),
                null,
                0,
                ScoreCategory.BONUS,
                "Bônus inválido",
                ScoreSource.MANUAL,
                null,
                null
        );

        assertThatThrownBy(() -> scoreEventService.createBatch(List.of(valid, invalid)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A pontuação não pode ser zero.");
        assertThat(scoreEventService.list(fixture.classroomId())).isEmpty();
    }

    private Fixture createFixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma " + suffix, "T" + suffix);
        var firstStudent = studentService.create("A" + suffix, "Ana " + suffix, "Ana");
        var secondStudent = studentService.create("B" + suffix, "Bruno " + suffix, "Bruno");
        classroomService.enroll(classroom.id(), firstStudent.id());
        classroomService.enroll(classroom.id(), secondStudent.id());
        return new Fixture(classroom.id(), firstStudent.id(), secondStudent.id());
    }

    private record Fixture(UUID classroomId, UUID firstStudentId, UUID secondStudentId) {
    }
}
