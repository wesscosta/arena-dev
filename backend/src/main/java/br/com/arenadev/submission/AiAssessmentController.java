package br.com.arenadev.submission;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions/{submissionId}/assessment/ai-suggestions")
public class AiAssessmentController {
    private final AiAssessmentService service;

    public AiAssessmentController(AiAssessmentService service) {
        this.service = service;
    }

    @PostMapping
    public AiAssessmentService.SuggestionView generate(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.generate(activityId, submissionId);
    }

    @GetMapping("/latest")
    public ResponseEntity<AiAssessmentService.SuggestionView> latest(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.latest(activityId, submissionId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{suggestionId}/apply")
    public AssessmentRubricService.AssessmentView apply(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @PathVariable UUID suggestionId
    ) {
        return service.apply(activityId, submissionId, suggestionId);
    }
}
