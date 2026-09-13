package br.com.arenadev.quiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/quiz")
public class QuizController {
    private final QuizService service;

    public QuizController(QuizService service) {
        this.service = service;
    }

    @GetMapping
    public QuizService.StateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuizService.StateView prepare(
            @PathVariable UUID sessionId,
            @Valid @RequestBody PrepareRequest request
    ) {
        return service.prepare(sessionId, request.questionId());
    }

    @PostMapping("/{roundId}/open")
    public QuizService.StateView open(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.open(sessionId, roundId);
    }

    @PostMapping("/{roundId}/lock")
    public QuizService.StateView lock(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.lock(sessionId, roundId);
    }

    @PostMapping("/{roundId}/reveal")
    public QuizService.StateView reveal(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.reveal(sessionId, roundId);
    }

    @PostMapping("/{roundId}/close")
    public QuizService.StateView close(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.close(sessionId, roundId);
    }

    public record PrepareRequest(@NotNull UUID questionId) {}
}
