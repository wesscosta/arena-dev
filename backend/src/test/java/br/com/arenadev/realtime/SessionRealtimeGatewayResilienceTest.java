package br.com.arenadev.realtime;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.time.Instant;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionRealtimeGatewayResilienceTest {

    private final SessionRealtimeGateway gateway =
            new SessionRealtimeGateway(tools.jackson.databind.json.JsonMapper.builder().build());

    @Test
    void slowSocketIsClosedWithoutStallingTheNextSender() throws Exception {
        UUID sessionId = UUID.randomUUID();
        WebSocketSession slow = socket("slow");
        CountDownLatch blocked = new CountDownLatch(1);
        doAnswer(invocation -> {
            blocked.countDown();
            Thread.sleep(SessionRealtimeGateway.SEND_TIME_LIMIT.toMillis() + 1_500);
            return null;
        }).when(slow).sendMessage(any(TextMessage.class));
        gateway.registerTeacher(sessionId, slow);

        Thread stuck = new Thread(() -> gateway.send(slow, "FIRST", sessionId, "a"));
        stuck.start();
        assertThat(blocked.await(2, TimeUnit.SECONDS)).isTrue();
        Thread.sleep(SessionRealtimeGateway.SEND_TIME_LIMIT.toMillis() + 300);

        long started = System.nanoTime();
        gateway.send(slow, "SECOND", sessionId, "b");
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);

        assertThat(elapsedMs).isLessThan(1_000);
        verify(slow, timeout(1_000)).close(CloseStatus.SESSION_NOT_RELIABLE);
        stuck.join(5_000);
    }

    @Test
    void silentSocketIsClosedAfterTheIdleLimit() throws Exception {
        WebSocketSession silent = socket("silent");
        WebSocketSession live = socket("live");
        gateway.touch(silent);
        gateway.touch(live);

        // Both were seen just now: nothing to close yet.
        assertThat(gateway.closeIdle(Instant.now())).isZero();

        // Past the idle limit without another frame, both count as half-open.
        Instant later = Instant.now().plus(SessionRealtimeGateway.IDLE_LIMIT).plusSeconds(1);
        assertThat(gateway.closeIdle(later)).isEqualTo(2);
        verify(silent).close(CloseStatus.SESSION_NOT_RELIABLE);
        verify(live).close(CloseStatus.SESSION_NOT_RELIABLE);
    }

    @Test
    void releasedSocketIsNotSweptAgain() throws Exception {
        WebSocketSession socket = socket("released");
        gateway.touch(socket);
        gateway.release(socket);

        assertThat(gateway.closeIdle(Instant.now().plus(SessionRealtimeGateway.IDLE_LIMIT).plusSeconds(1))).isZero();
        verify(socket, never()).close(any(CloseStatus.class));
    }

    private static WebSocketSession socket(String id) {
        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn(id);
        when(socket.isOpen()).thenReturn(true);
        when(socket.getAttributes()).thenReturn(new HashMap<>());
        when(socket.getTextMessageSizeLimit()).thenReturn(64 * 1024);
        return socket;
    }
}
