package br.com.arenadev.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.adapter.NativeWebSocketSession;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.SessionLimitExceededException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class SessionRealtimeGateway {
    private final Map<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();
    private final Map<UUID, Map<UUID, Set<WebSocketSession>>> participantSockets = new ConcurrentHashMap<>();
    private final Map<UUID, Set<WebSocketSession>> projectorSockets = new ConcurrentHashMap<>();
    private final Map<UUID, Set<WebSocketSession>> teacherSockets = new ConcurrentHashMap<>();
    // Outbound side of every socket. A phone that stops reading must not stall
    // the broadcast loop for the whole class: concurrent sends are buffered by
    // the decorator, the container's blocking send gives up after
    // SEND_TIME_LIMIT, and a socket over either limit is closed. The client
    // reconnects and reconciles through the runtime snapshot.
    // Keyed by the socket itself (identity), never by getId(): ids are an
    // implementation detail and absent on test doubles.
    private final Map<WebSocketSession, ConcurrentWebSocketSessionDecorator> outbound = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, Instant> lastSeen = new ConcurrentHashMap<>();
    static final Duration SEND_TIME_LIMIT = Duration.ofSeconds(3);
    static final int SEND_BUFFER_LIMIT_BYTES = 512 * 1024;
    /** Clients ping every 25 s; two missed pings mean a half-open connection. */
    static final Duration IDLE_LIMIT = Duration.ofSeconds(60);
    private static final String TOMCAT_BLOCKING_SEND_TIMEOUT = "org.apache.tomcat.websocket.BLOCKING_SEND_TIMEOUT";
    private static final Logger log = LoggerFactory.getLogger(SessionRealtimeGateway.class);
    private final AtomicLong framesSent = new AtomicLong();
    private final AtomicLong closedSlow = new AtomicLong();
    private final AtomicLong closedIdle = new AtomicLong();
    private final JsonMapper json;

    public SessionRealtimeGateway(JsonMapper json) {
        this.json = json;
    }

    public void register(UUID sessionId, WebSocketSession socket) {
        sessions.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(socket);
    }


    public void registerTeacher(UUID sessionId, WebSocketSession socket) {
        register(sessionId, socket);
        teacherSockets.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(socket);
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


    public void unregisterTeacher(UUID sessionId, WebSocketSession socket) {
        Set<WebSocketSession> sockets = teacherSockets.get(sessionId);
        if (sockets == null) return;
        sockets.remove(socket);
        if (sockets.isEmpty()) teacherSockets.remove(sessionId);
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

    public void broadcastTeachers(UUID sessionId, String type, Object payload) {
        broadcastTo(teacherSockets.getOrDefault(sessionId, Set.of()), sessionId, type, payload);
    }

    public void broadcastTeachersAfterCommit(UUID sessionId, String type, Object payload) {
        afterCommit(() -> broadcastTeachers(sessionId, type, payload));
    }

    public void broadcastParticipants(UUID sessionId, String type, Object payload) {
        Map<UUID, Set<WebSocketSession>> byParticipant = participantSockets.get(sessionId);
        if (byParticipant == null) return;
        for (Set<WebSocketSession> sockets : byParticipant.values()) {
            broadcastTo(sockets, sessionId, type, payload);
        }
    }

    public void broadcastParticipantsAfterCommit(UUID sessionId, String type, Object payload) {
        afterCommit(() -> broadcastParticipants(sessionId, type, payload));
    }

    public void broadcastProjectors(UUID sessionId, String type, Object payload) {
        broadcastTo(projectorSockets.getOrDefault(sessionId, Set.of()), sessionId, type, payload);
    }

    public void broadcastProjectorsAfterCommit(UUID sessionId, String type, Object payload) {
        afterCommit(() -> broadcastProjectors(sessionId, type, payload));
    }

    private void broadcastTo(Set<WebSocketSession> sockets, UUID sessionId, String type, Object payload) {
        RealtimeEvent event = new RealtimeEvent(type, sessionId, java.time.Instant.now().toString(), payload);
        String body;
        try {
            body = json.writeValueAsString(event);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar evento em tempo real.", error);
        }
        for (WebSocketSession socket : sockets) send(socket, body);
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
        if (!socket.isOpen()) {
            release(socket);
            return;
        }
        try {
            outbound.computeIfAbsent(socket, SessionRealtimeGateway::decorate)
                    .sendMessage(new TextMessage(body));
            framesSent.incrementAndGet();
        } catch (SessionLimitExceededException slow) {
            closedSlow.incrementAndGet();
            log.info("realtime closing slow socket session={} reason={}",
                    socket.getAttributes().get("arena.sessionId"), slow.getMessage());
            close(socket, CloseStatus.SESSION_NOT_RELIABLE);
        } catch (IOException ignored) {
            // A desconexão será tratada no ciclo do WebSocket.
        }
    }

    private static ConcurrentWebSocketSessionDecorator decorate(WebSocketSession socket) {
        if (socket instanceof NativeWebSocketSession nativeSocket
                && nativeSocket.getNativeSession() instanceof jakarta.websocket.Session container) {
            container.getUserProperties().put(TOMCAT_BLOCKING_SEND_TIMEOUT, SEND_TIME_LIMIT.toMillis());
        }
        return new ConcurrentWebSocketSessionDecorator(
                socket,
                (int) SEND_TIME_LIMIT.toMillis(),
                SEND_BUFFER_LIMIT_BYTES,
                ConcurrentWebSocketSessionDecorator.OverflowStrategy.TERMINATE
        );
    }

    /** Records inbound activity (any frame, including PING). */
    public void touch(WebSocketSession socket) {
        lastSeen.put(socket, Instant.now());
        outbound.computeIfAbsent(socket, SessionRealtimeGateway::decorate);
    }

    /** Forgets a socket once it is closed. */
    public void release(WebSocketSession socket) {
        lastSeen.remove(socket);
        outbound.remove(socket);
    }

    /** Closes sockets with no inbound frame since {@code now - IDLE_LIMIT}; returns how many. */
    public int closeIdle(Instant now) {
        Instant cutoff = now.minus(IDLE_LIMIT);
        int closed = 0;
        for (Map.Entry<WebSocketSession, Instant> entry : lastSeen.entrySet()) {
            if (!entry.getValue().isBefore(cutoff)) continue;
            WebSocketSession socket = entry.getKey();
            release(socket);
            close(socket, CloseStatus.SESSION_NOT_RELIABLE);
            closed++;
        }
        if (closed > 0) {
            closedIdle.addAndGet(closed);
            log.info("realtime closed {} idle socket(s)", closed);
        }
        return closed;
    }

    private void close(WebSocketSession socket, CloseStatus status) {
        try {
            if (socket.isOpen()) socket.close(status);
        } catch (IOException ignored) {
            // Already gone; afterConnectionClosed releases the registrations.
        }
    }

    /** Live counts for the teacher diagnostics view; no personal data. */
    public Diagnostics diagnostics(UUID sessionId) {
        Map<UUID, Set<WebSocketSession>> byParticipant = participantSockets.getOrDefault(sessionId, Map.of());
        int participantSocketsCount = byParticipant.values().stream().mapToInt(Set::size).sum();
        return new Diagnostics(
                teacherSockets.getOrDefault(sessionId, Set.of()).size(),
                byParticipant.size(),
                participantSocketsCount,
                projectorSockets.getOrDefault(sessionId, Set.of()).size(),
                framesSent.get(),
                closedSlow.get(),
                closedIdle.get()
        );
    }

    public record Diagnostics(
            int teacherSockets,
            int connectedParticipants,
            int participantSockets,
            int projectorSockets,
            long framesSentSinceStart,
            long slowSocketsClosedSinceStart,
            long idleSocketsClosedSinceStart
    ) {}

    public record RealtimeEvent(String type, UUID sessionId, String occurredAt, Object payload) {}
}
