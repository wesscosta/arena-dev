package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions/{submissionId}/assessment/feedback")
public class AssessmentFeedbackController {
    private final AssessmentFeedbackService service;

    public AssessmentFeedbackController(AssessmentFeedbackService service) {
        this.service = service;
    }

    @GetMapping
    public AssessmentFeedbackService.FeedbackView get(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.get(activityId, submissionId);
    }

    @PutMapping("/draft")
    public AssessmentFeedbackService.FeedbackView saveDraft(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @RequestBody SaveFeedbackRequest request
    ) {
        return service.saveDraft(activityId, submissionId, request.feedback());
    }

    @PostMapping("/from-ai")
    public AssessmentFeedbackService.FeedbackView useLatestAiSuggestion(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.useLatestAiSuggestion(activityId, submissionId);
    }

    @PostMapping("/publish")
    public AssessmentFeedbackService.FeedbackView publish(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.publish(activityId, submissionId);
    }

    public record SaveFeedbackRequest(String feedback) {}
}
