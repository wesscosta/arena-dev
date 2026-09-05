package br.com.arenadev.realtime;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.timer.SessionTimerService;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionSocketHandlerTimerTest {

    @Test
    void sendsTimerSnapshotWhenAuthenticatedTeacherConnects() throws Exception {
        UUID sessionId = UUID.randomUUID();
        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);
        SessionJoinService joinService = mock(SessionJoinService.class);
        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);

        var buzzerState = new BuzzerService.BuzzerStateView(
                "IDLE",
                null,
                null,
                null,
                List.of()
        );
        var timerState = new SessionTimerService.TimerStateView(null);

        when(buzzerService.state(sessionId)).thenReturn(buzzerState);
        when(timerService.state(sessionId)).thenReturn(timerState);

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService
        );

        WebSocketSession socket = socket(sessionId, () -> "teacher");
        handler.afterConnectionEstablished(socket);

        var order = inOrder(gateway);
        order.verify(gateway).register(sessionId, socket);
        order.verify(gateway).send(socket, "BUZZER_STATE", sessionId, buzzerState);
        order.verify(gateway).send(socket, "TIMER_STATE", sessionId, timerState);
    }

    @Test
    void sendsTimerSnapshotAfterParticipantAuthenticates() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        String token = "participant-token";

        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);
        SessionJoinService joinService = mock(SessionJoinService.class);
        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);
        SessionParticipant participant = mock(SessionParticipant.class);

        var connection = new SessionJoinService.ParticipantConnectionView(
                participantId,
                UUID.randomUUID(),
                "Aluno",
                true
        );
        var buzzerState = new BuzzerService.BuzzerStateView(
                "IDLE",
                null,
                null,
                null,
                List.of()
        );
        var timerState = new SessionTimerService.TimerStateView(null);

        when(participant.getId()).thenReturn(participantId);
        when(joinService.validateParticipantToken(sessionId, token)).thenReturn(participant);
        when(gateway.registerParticipant(
                eq(sessionId),
                eq(participantId),
                any()
        ))
                .thenReturn(1);
        when(joinService.markConnected(sessionId, token)).thenReturn(connection);
        when(buzzerService.state(sessionId)).thenReturn(buzzerState);
        when(timerService.state(sessionId)).thenReturn(timerState);

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService
        );

        WebSocketSession socket = socket(sessionId, null);
        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(
                socket,
                new TextMessage(
                        "{\"type\":\"AUTH_PARTICIPANT\",\"token\":\"" + token + "\"}"
                )
        );

        verify(gateway).send(
                socket,
                "AUTH_REQUIRED",
                sessionId,
                Map.of("message", "Autentique o participante neste canal.")
        );
        verify(gateway).send(socket, "AUTH_OK", sessionId, connection);
        verify(gateway).send(socket, "BUZZER_STATE", sessionId, buzzerState);
        verify(gateway).send(socket, "TIMER_STATE", sessionId, timerState);
    }

    private WebSocketSession socket(UUID sessionId, Principal principal) {
        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.getUri()).thenReturn(
                URI.create("ws://localhost/ws/sessions/" + sessionId)
        );
        when(socket.getPrincipal()).thenReturn(principal);
        when(socket.getAttributes()).thenReturn(new HashMap<>());
        return socket;
    }
}
