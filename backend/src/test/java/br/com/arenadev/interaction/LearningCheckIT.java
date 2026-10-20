package br.com.arenadev.interaction;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.learning.LearningTargetService;
import br.com.arenadev.learning.LearningTargetType;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class LearningCheckIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, LearningCheckIT.class);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private LearningTargetService targetService;
    @Autowired private LearningCheckService checkService;
    @Autowired private InteractionResponseService responseService;
    @Autowired private InteractionTraceService traceService;

    @Test
    void runsNativeLearningCheckFromTargetToEvidence() {
        Fixture fixture = fixture();

        LearningCheckService.StateView prepared = checkService.prepare(
                fixture.sessionId(),
                command(fixture.targetId())
        );
        assertThat(prepared.run().status()).isEqualTo(InteractionRunStatus.CREATED);
        assertThat(prepared.definition().learningTargetId()).isEqualTo(fixture.targetId());
        assertThat(prepared.evidenceCount()).isZero();

        LearningCheckService.StateView opened = checkService.open(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(opened.run().acceptsResponses()).isTrue();

        responseService.submit(
                prepared.run().id(),
                fixture.participantId(),
                "{\"selectedOptionKeys\":[\"b\"]}"
        );

        LearningCheckService.StateView locked = checkService.lock(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(locked.run().acceptsResponses()).isFalse();
        assertThat(locked.result().participation().responseCount()).isEqualTo(1);

        LearningCheckService.StateView evaluated = checkService.evaluate(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(evaluated.result().evaluation().correctCount()).isEqualTo(1);
        assertThat(evaluated.result().evaluation().accuracy()).isEqualTo(1.0);
        assertThat(evaluated.evidenceCount()).isEqualTo(1);

        LearningCheckService.StateView revealed = checkService.reveal(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(revealed.run().resultsVisiblePublicly()).isTrue();
        assertThat(revealed.evidenceCount()).isEqualTo(1);

        LearningCheckService.StateView closed = checkService.close(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(closed.run().status()).isEqualTo(InteractionRunStatus.CLOSED);
        LearningCheckService.StateView current = checkService.current(fixture.sessionId());
        assertThat(current.run().status()).isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(current.run().resultsVisiblePublicly()).isTrue();
        assertThat(current.result().evaluation().accuracy()).isEqualTo(1.0);

        InteractionTraceService.TraceView trace = traceService.trace(prepared.run().id());
        assertThat(trace.aiReady()).isTrue();
        assertThat(trace.gaps()).isEmpty();
        assertThat(trace.sessionId()).isEqualTo(fixture.sessionId());
        assertThat(trace.definition().learningTarget().id()).isEqualTo(fixture.targetId());
        assertThat(trace.responses()).hasSize(1);
        assertThat(trace.responses().getFirst().participantId())
                .isEqualTo(fixture.participantId());
        assertThat(trace.responses().getFirst().rawResponseJson())
                .contains("selectedOptionKeys");
        assertThat(trace.responses().getFirst().evaluation()).isNotNull();
        assertThat(trace.responses().getFirst().evaluation().evaluatorVersion()).isNotBlank();
        assertThat(trace.responses().getFirst().evidence()).isNotNull();
        assertThat(trace.result().evaluation().accuracy()).isEqualTo(1.0);
    }

    @Test
    void closeAutomaticallyLocksEvaluatesAndPersistsEvidence() {
        Fixture fixture = fixture();
        LearningCheckService.StateView prepared = checkService.prepare(
                fixture.sessionId(),
                command(fixture.targetId())
        );
        checkService.open(fixture.sessionId(), prepared.run().id());
        responseService.submit(
                prepared.run().id(),
                fixture.participantId(),
                "{\"selectedOptionKeys\":[\"b\"]}"
        );

        LearningCheckService.StateView closed = checkService.close(
                fixture.sessionId(),
                prepared.run().id()
        );

        assertThat(closed.run().status()).isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(closed.run().acceptsResponses()).isFalse();
        assertThat(closed.result().evaluation().correctCount()).isEqualTo(1);
        assertThat(closed.evidenceCount()).isEqualTo(1);
    }

    @Test
    void blocksSecondPendingLearningCheckInSameSession() {
        Fixture fixture = fixture();
        checkService.prepare(fixture.sessionId(), command(fixture.targetId()));

        assertThatThrownBy(() -> checkService.prepare(
                fixture.sessionId(),
                command(fixture.targetId())
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Finalize");
    }

    @Test
    void repeatCreatesNewRunWithSameDefinitionAndIndependentEvidence() {
        Fixture fixture = fixture();
        LearningCheckService.StateView prepared = checkService.prepare(
                fixture.sessionId(),
                command(fixture.targetId())
        );
        checkService.open(fixture.sessionId(), prepared.run().id());
        checkService.submit(
                fixture.sessionId(),
                prepared.run().id(),
                fixture.participantId(),
                "b"
        );
        LearningCheckService.StateView firstClosed = checkService.close(
                fixture.sessionId(),
                prepared.run().id()
        );

        assertThat(firstClosed.evidenceCount()).isEqualTo(1);
        assertThat(firstClosed.result().evaluation().correctCount()).isEqualTo(1);

        LearningCheckService.StateView repeated = checkService.repeat(
                fixture.sessionId(),
                prepared.run().id()
        );

        assertThat(repeated.run().id()).isNotEqualTo(prepared.run().id());
        assertThat(repeated.run().sequence()).isEqualTo(prepared.run().sequence() + 1);
        assertThat(repeated.run().status()).isEqualTo(InteractionRunStatus.ACTIVE);
        assertThat(repeated.run().acceptsResponses()).isTrue();
        assertThat(repeated.definition().id()).isEqualTo(prepared.definition().id());
        assertThat(repeated.evidenceCount()).isZero();
        assertThat(repeated.result().participation().responseCount()).isZero();

        checkService.submit(
                fixture.sessionId(),
                repeated.run().id(),
                fixture.participantId(),
                "a"
        );
        LearningCheckService.StateView secondClosed = checkService.close(
                fixture.sessionId(),
                repeated.run().id()
        );

        assertThat(secondClosed.result().evaluation().incorrectCount()).isEqualTo(1);
        assertThat(secondClosed.evidenceCount()).isEqualTo(1);

        LearningCheckService.StateView original = checkService.state(
                fixture.sessionId(),
                prepared.run().id()
        );
        assertThat(original.result().evaluation().correctCount()).isEqualTo(1);
        assertThat(original.evidenceCount()).isEqualTo(1);
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create(
                "Turma Check " + suffix,
                "LC" + suffix
        );
        var student = studentService.create(
                "LC-" + suffix,
                "Aluno Check " + suffix,
                null
        );
        classroomService.enroll(classroom.id(), student.id());
        var session = sessionService.start(
                classroom.id(),
                "Aula Check",
                Set.of(student.id())
        );
        SessionParticipant participant = participantRepository
                .findBySessionIdOrderByStudentNameAsc(session.id())
                .getFirst();

        var target = targetService.create(new LearningTargetService.CreateCommand(
                "Interpretar LEFT JOIN " + suffix,
                LearningTargetType.COMPETENCY,
                null
        ));
        return new Fixture(session.id(), participant.getId(), target.id());
    }

    private static LearningCheckService.PrepareCommand command(UUID targetId) {
        return new LearningCheckService.PrepareCommand(
                targetId,
                "Qual JOIN preserva todas as linhas da tabela esquerda?",
                List.of(
                        new LearningCheckService.OptionCommand("a", "INNER JOIN"),
                        new LearningCheckService.OptionCommand("b", "LEFT JOIN"),
                        new LearningCheckService.OptionCommand("c", "RIGHT JOIN")
                ),
                "b"
        );
    }

    private record Fixture(
            UUID sessionId,
            UUID participantId,
            UUID targetId
    ) {}
}
