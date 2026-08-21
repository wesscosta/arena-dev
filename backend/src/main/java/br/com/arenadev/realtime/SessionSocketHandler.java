package br.com.arenadev.realtime;

import br.com.arenadev.session.SessionJoinService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@Component
public class SessionSocketHandler extends TextWebSocketHandler {
    private static final String ATTR_SESSION_ID = "arena.sessionId";
    private static final String ATTR_TOKEN = "arena.participantToken";

    private final SessionRealtimeGateway gateway;
    private final SessionJoinService joinService;
    private final BuzzerService buzzerService;
    private final JsonMapper json = JsonMapper.builder().build();

    public SessionSocketHandler(
            SessionRealtimeGateway gateway,
            SessionJoinService joinService,
            BuzzerService buzzerService
    ) {
        this.gateway = gateway;
        this.joinService = joinService;
        this.buzzerService = buzzerService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession socket) throws Exception {
        UUID sessionId = resolveSessionId(socket.getUri());
        String token = queryParam(socket.getUri(), "token");

        socket.getAttributes().put(ATTR_SESSION_ID, sessionId);
        if (token != null && !token.isBlank()) {
            try {
                SessionJoinService.ParticipantConnectionView participant = joinService.markConnected(sessionId, token);
                socket.getAttributes().put(ATTR_TOKEN, token);
                gateway.broadcast(sessionId, "PARTICIPANT_CONNECTED", participant);
            } catch (RuntimeException error) {
                socket.close(CloseStatus.POLICY_VIOLATION.withReason(error.getMessage()));
                return;
            }
        }

        gateway.register(sessionId, socket);
        gateway.send(socket, "BUZZER_STATE", sessionId, buzzerService.state(sessionId));
    }

    @Override
    protected void handleTextMessage(WebSocketSession socket, TextMessage message) {
        UUID sessionId = (UUID) socket.getAttributes().get(ATTR_SESSION_ID);
        if (sessionId == null) return;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = json.readValue(message.getPayload(), Map.class);
            String type = String.valueOf(payload.getOrDefault("type", ""));
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

    @Override
    public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
        UUID sessionId = (UUID) socket.getAttributes().get(ATTR_SESSION_ID);
        if (sessionId == null) return;
        gateway.unregister(sessionId, socket);

        String token = (String) socket.getAttributes().get(ATTR_TOKEN);
        if (token != null) {
            try {
                SessionJoinService.ParticipantConnectionView participant = joinService.markDisconnected(sessionId, token);
                gateway.broadcast(sessionId, "PARTICIPANT_DISCONNECTED", participant);
            } catch (RuntimeException ignored) {
                // A sessão pode ter sido encerrada durante a desconexão.
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession socket, Throwable exception) throws Exception {
        if (socket.isOpen()) socket.close(CloseStatus.SERVER_ERROR);
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

    private static String queryParam(URI uri, String name) {
        if (uri == null) return null;
        return UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst(name);
    }

}
