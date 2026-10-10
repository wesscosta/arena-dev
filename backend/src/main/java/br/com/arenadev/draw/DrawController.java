package br.com.arenadev.draw;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/draw-attempts")
public class DrawController {
    private final DrawService service;
    public DrawController(DrawService service){this.service=service;}

    @GetMapping("/state")
    public DrawService.DrawStateView state(@PathVariable UUID sessionId){return service.state(sessionId);}
    @PutMapping("/policy")
    public DrawService.DrawStateView policy(@PathVariable UUID sessionId,
            @Valid @RequestBody PolicyRequest input){return service.setPolicy(sessionId,input.policy());}
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DrawService.DrawAttemptView select(@PathVariable UUID sessionId,
            @Valid @RequestBody CommandRequest input){return service.select(sessionId,input.requestId());}
    @PostMapping("/{attemptId}/resolve")
    public DrawService.DrawAttemptView resolve(@PathVariable UUID sessionId,@PathVariable UUID attemptId,
            @Valid @RequestBody ResolveRequest input){return service.resolve(sessionId,attemptId,input.requestId(),input.outcome(),input.score());}
    @PostMapping("/next-round")
    public DrawService.DrawStateView nextRound(@PathVariable UUID sessionId,
            @Valid @RequestBody CommandRequest input){return service.nextRound(sessionId,input.requestId());}

    public record CommandRequest(@NotNull UUID requestId) {}
    public record PolicyRequest(@NotNull DrawPolicy policy) {}
    public record ResolveRequest(@NotNull UUID requestId,@NotNull DrawOutcome outcome,DrawService.ScoreCommand score) {}
}
