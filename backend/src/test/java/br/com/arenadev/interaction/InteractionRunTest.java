package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InteractionRunTest {
    @Test
    void quizLikeFlowCanLockResponsesBeforeRevealingResults() {
        InteractionRun run = run();
        Instant opened = Instant.parse("2026-10-07T02:00:00Z");
        Instant locked = opened.plusSeconds(30);
        Instant revealed = locked.plusSeconds(5);
        Instant closed = revealed.plusSeconds(10);

        run.open(opened);
        assertThat(run.acceptsResponses()).isTrue();
        assertThat(run.resultsVisiblePublicly()).isFalse();

        run.lockResponses(locked);
        assertThat(run.acceptsResponses()).isFalse();
        assertThat(run.resultsVisiblePublicly()).isFalse();

        run.revealResults(revealed);
        assertThat(run.resultsVisiblePublicly()).isTrue();

        run.close(closed);
        assertThat(run.getStatus()).isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(run.getClosedAt()).isEqualTo(closed);
    }

    @Test
    void pollLikeFlowCanRevealResultsWhileStillAcceptingResponses() {
        InteractionRun run = run();
        Instant opened = Instant.parse("2026-10-07T02:00:00Z");

        run.open(opened);
        run.revealResults(opened.plusSeconds(5));

        assertThat(run.resultsVisiblePublicly()).isTrue();
        assertThat(run.acceptsResponses()).isTrue();

        run.close(opened.plusSeconds(20));

        assertThat(run.acceptsResponses()).isFalse();
        assertThat(run.getResponsesLockedAt()).isEqualTo(opened.plusSeconds(20));
    }

    @Test
    void createdOrClosedRunRejectsInvalidTransitions() {
        InteractionRun run = run();
        Instant now = Instant.parse("2026-10-07T02:00:00Z");

        assertThatThrownBy(() -> run.lockResponses(now))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ativa");
        assertThatThrownBy(() -> run.revealResults(now))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ativa");
        assertThatThrownBy(() -> run.close(now))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aberta");

        run.open(now);
        run.close(now.plusSeconds(1));

        assertThatThrownBy(() -> run.open(now.plusSeconds(2)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createdRunCanBeDiscardedWithoutFabricatingOpenOrLockTimestamps() {
        InteractionRun run = run();
        Instant now = Instant.parse("2026-10-07T02:00:00Z");

        run.discard(now);

        assertThat(run.getStatus()).isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(run.getOpenedAt()).isNull();
        assertThat(run.getResponsesLockedAt()).isNull();
        assertThat(run.getClosedAt()).isEqualTo(now);
    }

    @Test
    void sequenceMustBePositive() {
        assertThatThrownBy(() -> new InteractionRun(session(), definition(), 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positiva");
    }

    private static InteractionRun run() {
        return new InteractionRun(session(), definition(), 1);
    }

    private static ClassSession session() {
        return new ClassSession(new Classroom("Turma", "TURMA"), "Aula");
    }

    private static InteractionDefinition definition() {
        return new InteractionDefinition(
                "Prompt",
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        null,
                        null,
                        null,
                        Instant.parse("2026-10-07T02:00:00Z")
                )
        );
    }
}
