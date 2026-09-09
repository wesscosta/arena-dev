package br.com.arenadev.sessionevent;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class SessionEventController {
    private final SessionEventService service;

    public SessionEventController(SessionEventService service) {
        this.service = service;
    }

    @GetMapping("/api/session-events")
    public List<SessionEventService.SessionEventView> listByClassroom(
            @RequestParam UUID classroomId,
            @RequestParam(defaultValue = "200") int limit
    ) {
        return service.listByClassroom(classroomId, limit);
    }

    @GetMapping("/api/sessions/{sessionId}/events")
    public List<SessionEventService.SessionEventView> listBySession(@PathVariable UUID sessionId) {
        return service.listBySession(sessionId);
    }
}
