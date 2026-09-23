package br.com.arenadev.integration.provider.microsoft;

import java.time.OffsetDateTime;

public record MicrosoftEducationSubmission(
        String id,
        String assignmentId,
        String recipientUserId,
        String status,
        OffsetDateTime submittedDateTime,
        OffsetDateTime returnedDateTime,
        OffsetDateTime reassignedDateTime,
        String webUrl
) {
    public MicrosoftEducationSubmission {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationSubmission sem id.");
        }
    }
}
