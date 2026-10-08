package br.com.arenadev.learning.loop;

import br.com.arenadev.interaction.InteractionDefinition;
import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.session.ClassSession;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LearningCycleTest {
    @Test
    void requiresInterventionAndSeparateFollowupForVerification() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();
        ClassSession session = mock(ClassSession.class);
        LearningTarget target = mock(LearningTarget.class);
        InteractionDefinition definition = mock(InteractionDefinition.class);
        when(session.getId()).thenReturn(sessionId);
        when(target.getId()).thenReturn(targetId);
        when(definition.getId()).thenReturn(definitionId);
        when(definition.getLearningTarget()).thenReturn(target);
        InteractionRun before = run(session, definition);
        LearningCycle cycle = new LearningCycle(session, target, before);
        assertThat(cycle.getStatus()).isEqualTo(LearningCycleStatus.DIAGNOSED);
        assertThatThrownBy(() -> cycle.verify(before)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cycle.intervene(" ")).isInstanceOf(IllegalArgumentException.class);
        cycle.intervene("Discussão de alternativas e revisão do conceito.");
        assertThat(cycle.getStatus()).isEqualTo(LearningCycleStatus.INTERVENED);
        assertThatThrownBy(() -> cycle.verify(before)).isInstanceOf(IllegalArgumentException.class);
        InteractionRun after = run(session, definition);
        cycle.verify(after);
        assertThat(cycle.getFollowup()).isSameAs(after);
        assertThat(cycle.getStatus()).isEqualTo(LearningCycleStatus.VERIFIED);
        assertThatThrownBy(() -> cycle.intervene("Outra discussão"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static InteractionRun run(ClassSession session, InteractionDefinition definition) throws Exception {
        InteractionRun run = new InteractionRun(session, definition, 1);
        Field id = InteractionRun.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(run, UUID.randomUUID());
        return run;
    }
}
