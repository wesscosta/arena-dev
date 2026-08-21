package br.com.arenadev.session;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {
    private final SessionService service;

    public SessionController(SessionService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionService.SessionView start(@Valid @RequestBody StartSessionRequest request) {
        return service.start(request.classroomId(), request.title(), request.presentStudentIds());
    }

    @GetMapping("/{id}")
    public SessionService.SessionView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping
    public List<SessionService.SessionView> listByClassroom(@RequestParam UUID classroomId) {
        return service.listByClassroom(classroomId);
    }

    @GetMapping("/{id}/participants")
    public List<SessionService.ParticipantView> participants(@PathVariable UUID id) {
        return service.participants(id);
    }

    @PatchMapping("/{sessionId}/participants/{participantId}/presence")
    public SessionService.ParticipantView updatePresence(
            @PathVariable UUID sessionId,
            @PathVariable UUID participantId,
            @RequestBody PresenceRequest request
    ) {
        return service.updatePresence(sessionId, participantId, request.present());
    }

    @PostMapping("/{sessionId}/participants/{participantId}/release-device")
    public SessionService.ParticipantView releaseDevice(
            @PathVariable UUID sessionId,
            @PathVariable UUID participantId
    ) {
        return service.releaseDevice(sessionId, participantId);
    }

    @PostMapping("/{id}/finish")
    public SessionService.SessionView finish(@PathVariable UUID id) {
        return service.finish(id);
    }

    public record StartSessionRequest(
            @NotNull UUID classroomId,
            String title,
            Set<UUID> presentStudentIds
    ) {
    }

    public record PresenceRequest(boolean present) {
    }
}
