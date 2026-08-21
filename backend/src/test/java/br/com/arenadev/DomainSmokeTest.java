package br.com.arenadev;

import br.com.arenadev.session.SessionStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DomainSmokeTest {
    @Test
    void sessionStatusHasExpectedLifecycleStates() {
        assertThat(SessionStatus.values()).containsExactly(
                SessionStatus.ACTIVE,
                SessionStatus.FINISHED
        );
    }
}
