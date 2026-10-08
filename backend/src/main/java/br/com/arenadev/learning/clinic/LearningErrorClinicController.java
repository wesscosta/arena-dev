package br.com.arenadev.learning.clinic;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/learning-checks/{runId}/error-clinic")
public class LearningErrorClinicController {
    private final LearningErrorClinicService service;
    public LearningErrorClinicController(LearningErrorClinicService service) { this.service=service; }

    @GetMapping
    public LearningErrorClinicService.ClinicView read(@PathVariable UUID sessionId,@PathVariable UUID runId) {
        return service.read(sessionId,runId);
    }

    @PostMapping("/notes")
    public LearningErrorClinicService.ClinicView annotate(@PathVariable UUID sessionId,
            @PathVariable UUID runId,@Valid @RequestBody NoteCommand command) {
        return service.annotate(sessionId,runId,command.commandId(),command.optionKey(),command.note());
    }
    public record NoteCommand(@NotNull UUID commandId,@NotBlank String optionKey,
                              @NotBlank @Size(max=1200) String note) {}
}
