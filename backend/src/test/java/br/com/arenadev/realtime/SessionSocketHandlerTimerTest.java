package br.com.arenadev.realtime;

import br.com.arenadev.poll.PollService;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.wordcloud.WordCloudService;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
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
import static org.mockito.Mockito.never;
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
        WordCloudService wordCloudService = mock(WordCloudService.class);
        PollService pollService = mock(PollService.class);
        LiveStageService liveStageService = mock(LiveStageService.class);
        SessionRuntimeSnapshotService runtimeSnapshotService = mock(SessionRuntimeSnapshotService.class);

        var buzzerState = new BuzzerService.BuzzerStateView(
                "IDLE",
                null,
                null,
                null,
                List.of()
        );
        var timerState = new SessionTimerService.TimerStateView(null);
        var wordCloudState = WordCloudService.StateView.empty();

        when(buzzerService.state(sessionId)).thenReturn(buzzerState);
        when(timerService.state(sessionId)).thenReturn(timerState);
        var pollState = PollService.StateView.empty();
        var stageState = mock(LiveStageService.StateView.class);
        when(wordCloudService.state(sessionId)).thenReturn(wordCloudState);
        when(pollService.state(sessionId)).thenReturn(pollState);
        when(liveStageService.state(sessionId)).thenReturn(stageState);

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService,
                wordCloudService,
                pollService,
                liveStageService,
                runtimeSnapshotService
        );

        WebSocketSession socket = socket(sessionId, () -> "teacher");
        handler.afterConnectionEstablished(socket);

        var order = inOrder(gateway);
        order.verify(gateway).registerTeacher(sessionId, socket);
        order.verify(gateway).send(socket, "LIVE_STAGE_STATE", sessionId, stageState);
        order.verify(gateway).send(socket, "BUZZER_STATE", sessionId, buzzerState);
        order.verify(gateway).send(socket, "TIMER_STATE", sessionId, timerState);
        order.verify(gateway).send(socket, "WORD_CLOUD_STATE", sessionId, wordCloudState);
        order.verify(gateway).send(socket, "POLL_STATE", sessionId, pollState);
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
        WordCloudService wordCloudService = mock(WordCloudService.class);
        PollService pollService = mock(PollService.class);
        LiveStageService liveStageService = mock(LiveStageService.class);
        SessionRuntimeSnapshotService runtimeSnapshotService = mock(SessionRuntimeSnapshotService.class);
        SessionParticipant participant = mock(SessionParticipant.class);

        var connection = new SessionJoinService.ParticipantConnectionView(
                participantId,
                UUID.randomUUID(),
                "Aluno",
                true
        );
        var participantRuntimeSnapshot = mock(SessionRuntimeSnapshotService.ParticipantRuntimeSnapshot.class);

        when(participant.getId()).thenReturn(participantId);
        when(joinService.validateParticipantToken(sessionId, token)).thenReturn(participant);
        when(gateway.registerParticipant(
                eq(sessionId),
                eq(participantId),
                any()
        ))
                .thenReturn(1);
        when(joinService.markConnected(sessionId, token)).thenReturn(connection);
        when(runtimeSnapshotService.participant(sessionId, participantId)).thenReturn(participantRuntimeSnapshot);
        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService,
                wordCloudService,
                pollService,
                liveStageService,
                runtimeSnapshotService
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
        verify(gateway).send(socket, "RUNTIME_SNAPSHOT", sessionId, participantRuntimeSnapshot);
    }

    @Test
    void rejectsExpiredParticipantAuthenticationWithoutReconnectLoop() throws Exception {
        UUID sessionId = UUID.randomUUID();
        String token = "expired-token";

        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);
        SessionJoinService joinService = mock(SessionJoinService.class);
        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);
        WordCloudService wordCloudService = mock(WordCloudService.class);
        PollService pollService = mock(PollService.class);
        LiveStageService liveStageService = mock(LiveStageService.class);
        SessionRuntimeSnapshotService runtimeSnapshotService = mock(SessionRuntimeSnapshotService.class);

        when(joinService.validateParticipantToken(sessionId, token))
                .thenThrow(new IllegalArgumentException("Identificação temporária expirada."));

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService,
                wordCloudService,
                pollService,
                liveStageService,
                runtimeSnapshotService
        );

        WebSocketSession socket = socket(sessionId, null);
        when(socket.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(
                socket,
                new TextMessage(
                        "{\"type\":\"AUTH_PARTICIPANT\",\"token\":\"" + token + "\"}"
                )
        );

        verify(gateway).send(
                socket,
                "AUTH_FAILED",
                sessionId,
                Map.of("message", "Identificação temporária expirada.")
        );
        verify(socket).close(CloseStatus.POLICY_VIOLATION.withReason("Identificação temporária expirada."));
        verify(gateway, never()).registerParticipant(eq(sessionId), any(), any());
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
