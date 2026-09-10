package br.com.arenadev.timer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/timers")
public class SessionTimerController {
    private final SessionTimerService service;

    public SessionTimerController(SessionTimerService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionTimerService.TimerView create(
            @PathVariable UUID sessionId,
            @Valid @RequestBody CreateTimerRequest request
    ) {
        return service.create(sessionId, new SessionTimerService.CreateTimer(
                request.title(),
                request.instructions(),
                request.durationSeconds()
        ));
    }

    @GetMapping
    public List<SessionTimerService.TimerView> list(@PathVariable UUID sessionId) {
        return service.list(sessionId);
    }

    @GetMapping("/{timerId}")
    public SessionTimerService.TimerView get(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.get(sessionId, timerId);
    }

    @PostMapping("/{timerId}/start")
    public SessionTimerService.TimerView start(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.start(sessionId, timerId);
    }

    @PostMapping("/{timerId}/pause")
    public SessionTimerService.TimerView pause(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.pause(sessionId, timerId);
    }

    @PostMapping("/{timerId}/resume")
    public SessionTimerService.TimerView resume(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.resume(sessionId, timerId);
    }

    @PostMapping("/{timerId}/extend")
    public SessionTimerService.TimerView extend(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId,
            @Valid @RequestBody ExtendTimerRequest request
    ) {
        return service.extend(sessionId, timerId, request.seconds());
    }

    @PostMapping("/{timerId}/finish")
    public SessionTimerService.TimerView finish(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.finish(sessionId, timerId);
    }

    @PostMapping("/{timerId}/cancel")
    public SessionTimerService.TimerView cancel(
            @PathVariable UUID sessionId,
            @PathVariable UUID timerId
    ) {
        return service.cancel(sessionId, timerId);
    }

    public record CreateTimerRequest(
            @Size(max = 160) String title,
            @Size(max = 500) String instructions,
            @Min(1) @Max(SessionTimerService.MAX_DURATION_SECONDS) int durationSeconds
    ) {
    }

    public record ExtendTimerRequest(
            @Min(1) @Max(SessionTimerService.MAX_EXTENSION_SECONDS) int seconds
    ) {
    }
}
