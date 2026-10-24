package br.com.arenadev.submission;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

/** First completed deadline wins. Row locking ensures each expired attempt records one finalization. */
@Service
public class SubmissionDeadlineService {
    private final ActivitySubmissionRepository submissions;
    private final SubmissionProcessEvidenceService evidence;

    public SubmissionDeadlineService(ActivitySubmissionRepository submissions, SubmissionProcessEvidenceService evidence) {
        this.submissions = submissions;
        this.evidence = evidence;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ActivitySubmission expireIfDue(UUID submissionId) {
        ActivitySubmission submission = submissions.findLocked(submissionId).orElseThrow();
        Instant deadline = submission.getDeadlineAt();
        if (submission.isEditable() && deadline != null && !Instant.now().isBefore(deadline)) {
            submission.submit(deadline);
            ActivitySubmission saved = submissions.saveAndFlush(submission);
            evidence.recordSubmitted(saved);
            return saved;
        }
        return submission;
    }
}
