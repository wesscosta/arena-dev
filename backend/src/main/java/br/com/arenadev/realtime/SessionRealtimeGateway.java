package br.com.arenadev.realtime;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionRealtimeGateway {
    private final Map<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();
    private final JsonMapper json = JsonMapper.builder().build();

    public void register(UUID sessionId, WebSocketSession socket) {
        sessions.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(socket);
    }

    public void unregister(UUID sessionId, WebSocketSession socket) {
        Set<WebSocketSession> sockets = sessions.get(sessionId);
        if (sockets == null) return;
        sockets.remove(socket);
        if (sockets.isEmpty()) sessions.remove(sessionId);
    }

    public void broadcast(UUID sessionId, String type, Object payload) {
        RealtimeEvent event = new RealtimeEvent(type, sessionId, java.time.Instant.now().toString(), payload);
        String body;
        try {
            body = json.writeValueAsString(event);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar evento em tempo real.", error);
        }

        Set<WebSocketSession> sockets = sessions.getOrDefault(sessionId, Set.of());
        for (WebSocketSession socket : sockets) {
            send(socket, body);
        }
    }

    public void send(WebSocketSession socket, String type, UUID sessionId, Object payload) {
        try {
            send(socket, json.writeValueAsString(new RealtimeEvent(type, sessionId, java.time.Instant.now().toString(), payload)));
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar evento em tempo real.", error);
        }
    }

    private void send(WebSocketSession socket, String body) {
        if (!socket.isOpen()) return;
        try {
            synchronized (socket) {
                socket.sendMessage(new TextMessage(body));
            }
        } catch (IOException ignored) {
            // A desconexão será tratada no ciclo do WebSocket.
        }
    }

    public record RealtimeEvent(String type, UUID sessionId, String occurredAt, Object payload) {
    }
}
