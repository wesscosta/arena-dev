
package br.com.arenadev.submission;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions")
public class ActivitySubmissionController {
    private final ActivitySubmissionService service;

    public ActivitySubmissionController(ActivitySubmissionService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubmissionResponse start(@PathVariable UUID activityId, @RequestBody StartSubmissionRequest request) {
        return SubmissionResponse.from(service.start(activityId, request.enrollmentId()));
    }

    @GetMapping
    public List<SubmissionResponse> list(@PathVariable UUID activityId) {
        return service.list(activityId).stream().map(SubmissionResponse::from).toList();
    }

    @GetMapping("/{submissionId}")
    public SubmissionResponse get(@PathVariable UUID activityId, @PathVariable UUID submissionId) {
        return SubmissionResponse.from(service.get(activityId, submissionId));
    }

    public record StartSubmissionRequest(UUID enrollmentId) {}

    public record SubmissionResponse(
            UUID id,
            UUID activityId,
            UUID enrollmentId,
            ActivitySubmissionStatus status,
            SubmissionSource source,
            int attemptNumber,
            Instant startedAt,
            Instant submittedAt,
            Instant returnedAt,
            Instant createdAt,
            Instant updatedAt,
            long version
    ) {
        static SubmissionResponse from(ActivitySubmission submission) {
            return new SubmissionResponse(
                    submission.getId(),
                    submission.getActivity().getId(),
                    submission.getEnrollment().getId(),
                    submission.getStatus(),
                    submission.getSource(),
                    submission.getAttemptNumber(),
                    submission.getStartedAt(),
                    submission.getSubmittedAt(),
                    submission.getReturnedAt(),
                    submission.getCreatedAt(),
                    submission.getUpdatedAt(),
                    submission.getVersion()
            );
        }
    }
}
