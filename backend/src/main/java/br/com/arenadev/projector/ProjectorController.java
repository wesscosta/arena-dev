package br.com.arenadev.projector;

import br.com.arenadev.realtime.SessionRuntimeSnapshotService;
import br.com.arenadev.session.SessionJoinService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/projector")
public class ProjectorController {
    private final SessionJoinService joinService;
    private final SessionRuntimeSnapshotService runtimeSnapshotService;

    public ProjectorController(
            SessionJoinService joinService,
            SessionRuntimeSnapshotService runtimeSnapshotService
    ) {
        this.joinService = joinService;
        this.runtimeSnapshotService = runtimeSnapshotService;
    }

    @GetMapping("/{code}")
    public ProjectorView get(@PathVariable String code) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        return new ProjectorView(
                session.sessionId(),
                session.classroomName(),
                session.sessionTitle(),
                session.code(),
                session.expiresAt(),
                Instant.now(),
                runtimeSnapshotService.projector(session.sessionId())
        );
    }

    public record ProjectorView(
            UUID sessionId,
            String classroomName,
            String sessionTitle,
            String code,
            Instant expiresAt,
            Instant serverTime,
            SessionRuntimeSnapshotService.PublicRuntimeSnapshot runtime
    ) {
    }
}
