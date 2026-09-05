package br.com.arenadev.realtime;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.timer.SessionTimerService;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ProjectorSocketHandlerTest {

    @Test
    void authenticatesPublicProjectorWithoutRegisteringItAsTeacherOrParticipant() throws Exception {
        UUID sessionId = UUID.randomUUID();
        String code = "AB12CD";

        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);
        SessionJoinService joinService = mock(SessionJoinService.class);
        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);
        WebSocketSession socket = mock(WebSocketSession.class);

        var access = new SessionJoinService.PublicSessionView(
                sessionId,
                "Turma A",
                "Aula ao vivo",
                code,
                Instant.parse("2026-09-06T03:00:00Z")
        );
        var timerState = new SessionTimerService.TimerStateView(null);

        when(socket.getUri()).thenReturn(URI.create("ws://localhost/ws/projector/" + sessionId));
        when(socket.getAttributes()).thenReturn(new HashMap<>());
        when(joinService.validateProjectorAccess(sessionId, code)).thenReturn(access);
        when(timerService.state(sessionId)).thenReturn(timerState);

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService
        );

        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(
                socket,
                new TextMessage("{\"type\":\"AUTH_PROJECTOR\",\"code\":\"" + code + "\"}")
        );

        verify(joinService).validateProjectorAccess(sessionId, code);
        verify(gateway).registerProjector(sessionId, socket);
        verify(gateway, never()).register(sessionId, socket);
        verifyNoInteractions(buzzerService);

        var ordered = inOrder(gateway);
        ordered.verify(gateway).send(
                eq(socket),
                eq("AUTH_REQUIRED"),
                eq(sessionId),
                any()
        );
        ordered.verify(gateway).registerProjector(sessionId, socket);
        ordered.verify(gateway).send(
                eq(socket),
                eq("AUTH_OK"),
                eq(sessionId),
                any()
        );
        ordered.verify(gateway).send(socket, "TIMER_STATE", sessionId, timerState);
    }
}
