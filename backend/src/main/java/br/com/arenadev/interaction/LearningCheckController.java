package br.com.arenadev.interaction;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/learning-checks")
public class LearningCheckController {
    private final LearningCheckService service;

    public LearningCheckController(LearningCheckService service) {
        this.service = service;
    }

    @GetMapping("/current")
    public LearningCheckService.StateView current(@PathVariable UUID sessionId) {
        return service.current(sessionId);
    }

    @GetMapping("/{runId}")
    public LearningCheckService.StateView state(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.state(sessionId, runId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningCheckService.StateView prepare(
            @PathVariable UUID sessionId,
            @Valid @RequestBody PrepareRequest request
    ) {
        return service.prepare(sessionId, new LearningCheckService.PrepareCommand(
                request.learningTargetId(),
                request.prompt(),
                request.options().stream()
                        .map(option -> new LearningCheckService.OptionCommand(
                                option.key(),
                                option.label()
                        ))
                        .toList(),
                request.correctOptionKey()
        ));
    }

    @PostMapping("/{runId}/open")
    public LearningCheckService.StateView open(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.open(sessionId, runId);
    }

    @PostMapping("/{runId}/lock")
    public LearningCheckService.StateView lock(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.lock(sessionId, runId);
    }

    @PostMapping("/{runId}/evaluate")
    public LearningCheckService.StateView evaluate(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.evaluate(sessionId, runId);
    }

    @PostMapping("/{runId}/reveal")
    public LearningCheckService.StateView reveal(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.reveal(sessionId, runId);
    }

    @PostMapping("/{runId}/close")
    public LearningCheckService.StateView close(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.close(sessionId, runId);
    }

    @PostMapping("/{runId}/repeat")
    public LearningCheckService.StateView repeat(
            @PathVariable UUID sessionId,
            @PathVariable UUID runId
    ) {
        return service.repeat(sessionId, runId);
    }

    public record PrepareRequest(
            @NotNull UUID learningTargetId,
            @NotBlank @Size(max = 1200) String prompt,
            @NotNull @Size(min = 2, max = 6) List<@Valid OptionRequest> options,
            @NotBlank @Size(max = 100) String correctOptionKey
    ) {}

    public record OptionRequest(
            @NotBlank @Size(max = 100) String key,
            @NotBlank @Size(max = 300) String label
    ) {}
}
