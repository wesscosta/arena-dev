
package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions/{submissionId}/review")
public class SubmissionReviewController {
    private final SubmissionReviewService service;

    public SubmissionReviewController(SubmissionReviewService service) { this.service = service; }

    @PostMapping("/open")
    public SubmissionReviewService.ReviewView open(@PathVariable UUID activityId, @PathVariable UUID submissionId) {
        return service.open(activityId, submissionId);
    }

    @PutMapping("/notes")
    public SubmissionReviewService.ReviewView saveNotes(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @RequestBody SaveNotesRequest request
    ) {
        return service.saveNotes(activityId, submissionId, request.teacherNotes());
    }

    public record SaveNotesRequest(String teacherNotes) {}
}
