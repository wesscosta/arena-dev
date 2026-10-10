package br.com.arenadev.learning.loop;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/learning-cycles")
public class LearningCycleController {
    private final LearningCycleService service;

    public LearningCycleController(LearningCycleService service) { this.service = service; }

    @GetMapping
    public List<LearningCycleService.CycleView> list(@PathVariable UUID sessionId) {
        return service.list(sessionId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningCycleService.CycleView diagnose(@PathVariable UUID sessionId,
                                                    @Valid @RequestBody DiagnoseRequest request) {
        return service.diagnose(sessionId, request.baselineRunId());
    }

    @GetMapping("/{cycleId}/comparison")
    public LearningCycleService.ComparisonView comparison(@PathVariable UUID sessionId,
                                                          @PathVariable UUID cycleId) {
        return service.comparison(sessionId, cycleId);
    }

    @PostMapping("/{cycleId}/intervention")
    public LearningCycleService.CycleView intervene(@PathVariable UUID sessionId,
                                                    @PathVariable UUID cycleId,
                                                    @Valid @RequestBody InterventionRequest request) {
        return service.intervene(sessionId, cycleId, request.note(),
                request.type() == null ? InterventionType.EXPLANATION : request.type());
    }

    @PostMapping("/{cycleId}/verification")
    public LearningCycleService.CycleView verify(@PathVariable UUID sessionId,
                                                 @PathVariable UUID cycleId,
                                                 @Valid @RequestBody VerificationRequest request) {
        return service.verify(sessionId, cycleId, request.followupRunId());
    }

    public record DiagnoseRequest(@NotNull UUID baselineRunId) {}
    public record InterventionRequest(@NotBlank @Size(max = 2000) String note,
                                      InterventionType type) {}
    public record VerificationRequest(@NotNull UUID followupRunId) {}
}
