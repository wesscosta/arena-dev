package br.com.arenadev.interaction;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/join/{code}/learning-check")
public class LearningCheckJoinController {
    private final SessionJoinService joinService;
    private final LearningCheckService checkService;

    public LearningCheckJoinController(
            SessionJoinService joinService,
            LearningCheckService checkService
    ) {
        this.joinService = joinService;
        this.checkService = checkService;
    }

    @GetMapping
    public LearningCheckService.ParticipantStateView current(
            @PathVariable String code,
            @RequestParam @NotBlank String token
    ) {
        var session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(
                session.sessionId(),
                token
        );
        return checkService.participantState(
                session.sessionId(),
                participant.getId()
        );
    }

    @PostMapping("/{runId}/answer")
    public LearningCheckService.ParticipantStateView answer(
            @PathVariable String code,
            @PathVariable UUID runId,
            @Valid @RequestBody AnswerRequest request
    ) {
        var session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(
                session.sessionId(),
                request.token()
        );
        return checkService.submit(
                session.sessionId(),
                runId,
                participant.getId(),
                request.optionKey()
        );
    }

    public record AnswerRequest(
            @NotBlank String token,
            @NotNull @NotBlank @Size(max = 100) String optionKey
    ) {}
}
