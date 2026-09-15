
package br.com.arenadev.submission;

import java.time.Instant;
import java.util.List;

public interface LearningPlatformGateway {
    LearningPlatformProvider provider();
    default boolean configured() { return false; }
    List<ExternalSubmissionPayload> fetchSubmissions(ActivityProviderLink activityLink);
    void publishFeedback(PublishedFeedbackPayload payload);

    record ExternalSubmissionPayload(String externalSubmissionId, String externalUserId, Instant submittedAt, List<ExternalItemPayload> items) {}
    record ExternalItemPayload(SubmissionItemKind kind, String externalItemId, Object content) {}
    record PublishedFeedbackPayload(String externalAssignmentId, String externalSubmissionId, String feedback, Instant publishedAt) {}
}
