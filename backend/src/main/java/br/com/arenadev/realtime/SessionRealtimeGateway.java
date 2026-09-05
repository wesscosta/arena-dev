package br.com.arenadev.realtime;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
    private final Map<UUID, Map<UUID, Set<WebSocketSession>>> participantSockets = new ConcurrentHashMap<>();
    private final Map<UUID, Set<WebSocketSession>> projectorSockets = new ConcurrentHashMap<>();
    private final JsonMapper json = JsonMapper.builder().build();

    public void register(UUID sessionId, WebSocketSession socket) {
        sessions.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(socket);
    }

    public void registerProjector(UUID sessionId, WebSocketSession socket) {
        projectorSockets.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(socket);
    }

    public int registerParticipant(UUID sessionId, UUID participantId, WebSocketSession socket) {
        register(sessionId, socket);
        Set<WebSocketSession> sockets = participantSockets
                .computeIfAbsent(sessionId, ignored -> new ConcurrentHashMap<>())
                .computeIfAbsent(participantId, ignored -> ConcurrentHashMap.newKeySet());
        sockets.add(socket);
        return sockets.size();
    }

    public int unregisterParticipant(UUID sessionId, UUID participantId, WebSocketSession socket) {
        Map<UUID, Set<WebSocketSession>> byParticipant = participantSockets.get(sessionId);
        if (byParticipant == null) return 0;
        Set<WebSocketSession> sockets = byParticipant.get(participantId);
        if (sockets == null) return 0;
        sockets.remove(socket);
        if (sockets.isEmpty()) byParticipant.remove(participantId);
        if (byParticipant.isEmpty()) participantSockets.remove(sessionId);
        return sockets.size();
    }

    public void unregister(UUID sessionId, WebSocketSession socket) {
        Set<WebSocketSession> sockets = sessions.get(sessionId);
        if (sockets == null) return;
        sockets.remove(socket);
        if (sockets.isEmpty()) sessions.remove(sessionId);
    }

    public void unregisterProjector(UUID sessionId, WebSocketSession socket) {
        Set<WebSocketSession> sockets = projectorSockets.get(sessionId);
        if (sockets == null) return;
        sockets.remove(socket);
        if (sockets.isEmpty()) projectorSockets.remove(sessionId);
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
        for (WebSocketSession socket : sockets) send(socket, body);
    }

    public void broadcastAfterCommit(UUID sessionId, String type, Object payload) {
        afterCommit(() -> broadcast(sessionId, type, payload));
    }

    public void broadcastProjectors(UUID sessionId, String type, Object payload) {
        RealtimeEvent event = new RealtimeEvent(type, sessionId, java.time.Instant.now().toString(), payload);
        String body;
        try {
            body = json.writeValueAsString(event);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar evento em tempo real.", error);
        }

        Set<WebSocketSession> sockets = projectorSockets.getOrDefault(sessionId, Set.of());
        for (WebSocketSession socket : sockets) send(socket, body);
    }

    public void broadcastProjectorsAfterCommit(UUID sessionId, String type, Object payload) {
        afterCommit(() -> broadcastProjectors(sessionId, type, payload));
    }

    private void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
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

    public record RealtimeEvent(String type, UUID sessionId, String occurredAt, Object payload) {}
}
