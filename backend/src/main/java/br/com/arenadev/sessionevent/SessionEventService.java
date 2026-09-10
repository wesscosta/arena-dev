package br.com.arenadev.sessionevent;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionEventService {
    public static final int DEFAULT_LIMIT = 200;
    public static final int MAX_LIMIT = 500;

    private final SessionEventRepository eventRepository;
    private final ClassroomRepository classroomRepository;
    private final ClassSessionRepository sessionRepository;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public SessionEventService(
            SessionEventRepository eventRepository,
            ClassroomRepository classroomRepository,
            ClassSessionRepository sessionRepository
    ) {
        this.eventRepository = eventRepository;
        this.classroomRepository = classroomRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public List<SessionEventView> listByClassroom(UUID classroomId, int requestedLimit) {
        if (!classroomRepository.existsById(classroomId)) {
            throw new ResourceNotFoundException("Turma não encontrada.");
        }
        int limit = normalizeLimit(requestedLimit);
        return eventRepository.findRecentByClassroomId(classroomId, PageRequest.of(0, limit))
                .stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SessionEventView> listBySession(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new ResourceNotFoundException("Sessão não encontrada.");
        }
        return eventRepository.findBySessionIdOrderBySequenceNoAsc(sessionId)
                .stream()
                .map(this::toView)
                .toList();
    }

    public void record(
            ClassSession session,
            SessionEventType eventType,
            SessionEventActor actor,
            String summary,
            Map<String, ?> payload
    ) {
        if (session == null || eventType == null || actor == null) {
            throw new IllegalArgumentException("Evento de sessão inválido.");
        }
        eventRepository.save(new SessionEvent(
                session,
                eventType,
                actor,
                normalizeSummary(summary),
                writePayload(payload)
        ));
    }

    private SessionEventView toView(SessionEvent event) {
        ClassSession session = event.getSession();
        return new SessionEventView(
                event.getId(),
                event.getSequenceNo(),
                session.getId(),
                session.getClassroom().getId(),
                session.getTitle(),
                event.getEventType(),
                event.getActor(),
                event.getSummary(),
                readPayload(event.getPayloadJson()),
                event.getOccurredAt()
        );
    }

    private int normalizeLimit(int requestedLimit) {
        if (requestedLimit <= 0) return DEFAULT_LIMIT;
        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private static String normalizeSummary(String summary) {
        String value = summary == null || summary.isBlank()
                ? "Evento da sessão"
                : summary.trim().replaceAll("\\s+", " ");
        return value.length() <= 280 ? value : value.substring(0, 280);
    }

    private String writePayload(Map<String, ?> payload) {
        Map<String, ?> safe = payload == null ? Map.of() : payload;
        try {
            return objectMapper.writeValueAsString(safe);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Payload do evento de sessão é inválido.", ex);
        }
    }

    private Map<String, Object> readPayload(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            Map<String, Object> parsed = objectMapper.readValue(
                    raw,
                    new TypeReference<LinkedHashMap<String, Object>>() {}
            );
            return parsed == null
                    ? Map.of()
                    : Collections.unmodifiableMap(new LinkedHashMap<>(parsed));
        } catch (Exception ex) {
            return Map.of();
        }
    }

    public record SessionEventView(
            UUID id,
            Long sequenceNo,
            UUID sessionId,
            UUID classroomId,
            String sessionTitle,
            SessionEventType eventType,
            SessionEventActor actor,
            String summary,
            Map<String, Object> payload,
            Instant occurredAt
    ) {
    }
}
