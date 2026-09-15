package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/assessment/batch")
public class BatchAssessmentController {
    private final BatchAssessmentService service;
    public BatchAssessmentController(BatchAssessmentService service) { this.service = service; }

    @GetMapping("/queue")
    public BatchAssessmentService.QueueView queue(@PathVariable UUID activityId) { return service.queue(activityId); }

    @PostMapping("/ai-suggestions")
    public BatchAssessmentService.BatchResult generate(@PathVariable UUID activityId, @RequestBody BatchRequest request) {
        return service.generateAiSuggestions(activityId, request.submissionIds());
    }

    public record BatchRequest(List<UUID> submissionIds) {}
}
