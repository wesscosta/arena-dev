package br.com.arenadev.poll;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/sessions/{sessionId}/poll")
public class PollController {
    private final PollService service;

    public PollController(PollService service) {
        this.service = service;
    }

    @GetMapping
    public PollService.StateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollService.StateView create(
            @PathVariable UUID sessionId,
            @Valid @RequestBody CreateRequest request
    ) {
        return service.create(sessionId, new PollService.CreateCommand(
                request.prompt(),
                request.options(),
                request.liveResults()
        ));
    }

    @PostMapping("/{roundId}/reveal")
    public PollService.StateView reveal(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.reveal(sessionId, roundId);
    }

    @PostMapping("/{roundId}/close")
    public PollService.StateView close(@PathVariable UUID sessionId, @PathVariable UUID roundId) {
        return service.close(sessionId, roundId);
    }

    public record CreateRequest(
            @NotBlank @Size(max = 280) String prompt,
            @Size(min = 2, max = 6) List<@NotBlank @Size(max = 160) String> options,
            boolean liveResults
    ) {}
}
