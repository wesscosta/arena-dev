package br.com.arenadev.projector;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.timer.SessionTimerService;
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
    private final SessionTimerService timerService;

    public ProjectorController(
            SessionJoinService joinService,
            SessionTimerService timerService
    ) {
        this.joinService = joinService;
        this.timerService = timerService;
    }

    @GetMapping("/{code}")
    public ProjectorView get(@PathVariable String code) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        SessionTimerService.TimerStateView timerState = timerService.state(session.sessionId());

        return new ProjectorView(
                session.sessionId(),
                session.classroomName(),
                session.sessionTitle(),
                session.code(),
                session.expiresAt(),
                Instant.now(),
                timerState.timer()
        );
    }

    public record ProjectorView(
            UUID sessionId,
            String classroomName,
            String sessionTitle,
            String code,
            Instant expiresAt,
            Instant serverTime,
            SessionTimerService.TimerView timer
    ) {
    }
}
