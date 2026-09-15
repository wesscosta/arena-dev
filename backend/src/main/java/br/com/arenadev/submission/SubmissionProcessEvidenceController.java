package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions/{submissionId}/evidence")
public class SubmissionProcessEvidenceController {
    private final SubmissionProcessEvidenceService service;

    public SubmissionProcessEvidenceController(SubmissionProcessEvidenceService service) {
        this.service = service;
    }

    @GetMapping
    public SubmissionProcessEvidenceService.EvidenceView evidence(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.evidence(activityId, submissionId);
    }
}
