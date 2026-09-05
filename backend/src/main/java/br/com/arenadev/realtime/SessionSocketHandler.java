package br.com.arenadev.realtime;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.timer.SessionTimerService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class SessionSocketHandler extends TextWebSocketHandler {
    private static final String ATTR_SESSION_ID = "arena.sessionId";
    private static final String ATTR_PARTICIPANT_ID = "arena.participantId";
    private static final String ATTR_TOKEN = "arena.participantToken";
    private static final String ATTR_RATE_WINDOW = "arena.rateWindow";
    private static final String ATTR_RATE_COUNT = "arena.rateCount";
    private static final int MAX_MESSAGES_PER_SECOND = 8;

    private final SessionRealtimeGateway gateway;
    private final SessionJoinService joinService;
    private final BuzzerService buzzerService;
    private final SessionTimerService timerService;
    private final JsonMapper json = JsonMapper.builder().build();

    public SessionSocketHandler(
            SessionRealtimeGateway gateway,
            SessionJoinService joinService,
            BuzzerService buzzerService,
            SessionTimerService timerService
    ) {
        this.gateway = gateway;
        this.joinService = joinService;
        this.buzzerService = buzzerService;
        this.timerService = timerService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession socket) throws Exception {
        UUID sessionId = resolveSessionId(socket.getUri());
        socket.getAttributes().put(ATTR_SESSION_ID, sessionId);

        // O professor chega autenticado pela sessão HTTP; o aluno autentica no primeiro frame.
        if (socket.getPrincipal() != null) {
            gateway.register(sessionId, socket);
            sendSessionState(socket, sessionId);
        } else {
            gateway.send(socket, "AUTH_REQUIRED", sessionId, Map.of("message", "Autentique o participante neste canal."));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession socket, TextMessage message) {
        UUID sessionId = (UUID) socket.getAttributes().get(ATTR_SESSION_ID);
        if (sessionId == null) return;
        try {
            enforceRateLimit(socket);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = json.readValue(message.getPayload(), Map.class);
            String type = String.valueOf(payload.getOrDefault("type", ""));

            if ("AUTH_PARTICIPANT".equals(type)) {
                authenticateParticipant(socket, sessionId, String.valueOf(payload.getOrDefault("token", "")));
                return;
            }
            if ("PING".equals(type)) {
                gateway.send(socket, "PONG", sessionId, Map.of("at", Instant.now().toString()));
                return;
            }
            if ("BUZZER_PRESS".equals(type)) {
                String token = (String) socket.getAttributes().get(ATTR_TOKEN);
                if (token == null) throw new IllegalArgumentException("Somente participantes identificados podem acionar o Buzzer.");
                buzzerService.press(sessionId, token);
            }
        } catch (RuntimeException error) {
            gateway.send(socket, "ERROR", sessionId, Map.of("message", error.getMessage() == null ? "Evento inválido." : error.getMessage()));
        } catch (Exception error) {
            gateway.send(socket, "ERROR", sessionId, Map.of("message", "Mensagem em tempo real inválida."));
        }
    }

    private void authenticateParticipant(WebSocketSession socket, UUID sessionId, String token) {
        if (socket.getAttributes().get(ATTR_TOKEN) != null) return;
        SessionParticipant participant = joinService.validateParticipantToken(sessionId, token);
        int connections = gateway.registerParticipant(sessionId, participant.getId(), socket);
        socket.getAttributes().put(ATTR_TOKEN, token);
        socket.getAttributes().put(ATTR_PARTICIPANT_ID, participant.getId());
        SessionJoinService.ParticipantConnectionView view = connections == 1
                ? joinService.markConnected(sessionId, token)
                : SessionJoinService.ParticipantConnectionView.from(participant);
        gateway.broadcast(sessionId, "PARTICIPANT_CONNECTED", view);
        gateway.send(socket, "AUTH_OK", sessionId, view);
        sendSessionState(socket, sessionId);
    }

    private void sendSessionState(WebSocketSession socket, UUID sessionId) {
        gateway.send(socket, "BUZZER_STATE", sessionId, buzzerService.state(sessionId));
        gateway.send(socket, "TIMER_STATE", sessionId, timerService.state(sessionId));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
        UUID sessionId = (UUID) socket.getAttributes().get(ATTR_SESSION_ID);
        if (sessionId == null) return;
        gateway.unregister(sessionId, socket);

        UUID participantId = (UUID) socket.getAttributes().get(ATTR_PARTICIPANT_ID);
        String token = (String) socket.getAttributes().get(ATTR_TOKEN);
        if (participantId != null && token != null) {
            int remaining = gateway.unregisterParticipant(sessionId, participantId, socket);
            if (remaining == 0) {
                try {
                    SessionJoinService.ParticipantConnectionView participant = joinService.markDisconnected(sessionId, token);
                    gateway.broadcast(sessionId, "PARTICIPANT_DISCONNECTED", participant);
                } catch (RuntimeException ignored) {
                    // A sessão ou o token podem ter sido encerrados/liberados.
                }
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession socket, Throwable exception) throws Exception {
        if (socket.isOpen()) socket.close(CloseStatus.SERVER_ERROR);
    }

    private static void enforceRateLimit(WebSocketSession socket) {
        long now = System.currentTimeMillis();
        Long window = (Long) socket.getAttributes().get(ATTR_RATE_WINDOW);
        Integer count = (Integer) socket.getAttributes().get(ATTR_RATE_COUNT);
        if (window == null || now - window >= 1000) {
            socket.getAttributes().put(ATTR_RATE_WINDOW, now);
            socket.getAttributes().put(ATTR_RATE_COUNT, 1);
            return;
        }
        int next = (count == null ? 0 : count) + 1;
        socket.getAttributes().put(ATTR_RATE_COUNT, next);
        if (next > MAX_MESSAGES_PER_SECOND) throw new IllegalArgumentException("Muitas mensagens em sequência. Aguarde um instante.");
    }

    private static UUID resolveSessionId(URI uri) {
        if (uri == null) throw new IllegalArgumentException("Sessão WebSocket inválida.");
        String path = uri.getPath();
        String prefix = "/ws/sessions/";
        int index = path.indexOf(prefix);
        if (index < 0) throw new IllegalArgumentException("Sessão WebSocket inválida.");
        String rawId = path.substring(index + prefix.length()).split("/")[0];
        return UUID.fromString(rawId);
    }
}
