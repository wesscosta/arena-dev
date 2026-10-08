package br.com.arenadev.learning.confidence;

import br.com.arenadev.session.SessionJoinService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
public class LearnerConfidenceController {
    private final LearnerConfidenceService service;
    private final SessionJoinService join;
    public LearnerConfidenceController(LearnerConfidenceService service,SessionJoinService join) {
        this.service=service;
        this.join=join;
    }

    @PostMapping("/api/join/{code}/learning-check/{runId}/confidence")
    public OwnView record(@PathVariable String code,@PathVariable UUID runId,
                          @Valid @RequestBody OwnRequest request) {
        var session=join.lookup(code);
        var participant=join.validateParticipantToken(session.sessionId(),request.token());
        return new OwnView(service.record(session.sessionId(),runId,participant.getId(),request.level()));
    }

    @GetMapping("/api/join/{code}/learning-check/{runId}/confidence")
    public OwnView own(@PathVariable String code,@PathVariable UUID runId,
                       @RequestParam @NotBlank String token) {
        var session=join.lookup(code);
        var participant=join.validateParticipantToken(session.sessionId(),token);
        return new OwnView(service.own(session.sessionId(),runId,participant.getId()));
    }

    @GetMapping("/api/sessions/{sessionId}/learning-checks/{runId}/confidence-summary")
    public LearnerConfidenceService.Summary summary(@PathVariable UUID sessionId,@PathVariable UUID runId) {
        return service.summary(sessionId,runId);
    }

    public record OwnRequest(@NotBlank String token,@NotNull LearnerConfidenceService.Level level) {}
    public record OwnView(LearnerConfidenceService.Level level) {}
}
