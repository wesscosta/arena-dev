package br.com.arenadev.realtime;

import br.com.arenadev.stage.LiveStageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * Teacher-only snapshot of a live session's connections. Evidence for the
 * classroom network gates: who is connected, and whether the server had to
 * drop slow or silent sockets.
 */
@RestController
public class RealtimeDiagnosticsController {
    private final SessionRealtimeGateway gateway;
    private final LiveStageService liveStageService;

    public RealtimeDiagnosticsController(SessionRealtimeGateway gateway, LiveStageService liveStageService) {
        this.gateway = gateway;
        this.liveStageService = liveStageService;
    }

    @GetMapping("/api/diagnostics/sessions/{sessionId}")
    public SessionDiagnosticsView session(@PathVariable UUID sessionId) {
        return new SessionDiagnosticsView(
                sessionId,
                Instant.now(),
                liveStageService.state(sessionId).stageVersion(),
                gateway.diagnostics(sessionId)
        );
    }

    public record SessionDiagnosticsView(
            UUID sessionId,
            Instant at,
            long stageVersion,
            SessionRealtimeGateway.Diagnostics realtime
    ) {}
}
