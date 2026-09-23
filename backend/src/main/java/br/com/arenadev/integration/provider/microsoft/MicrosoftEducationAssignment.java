package br.com.arenadev.integration.provider.microsoft;

import java.time.OffsetDateTime;

public record MicrosoftEducationAssignment(
        String id,
        String classId,
        String displayName,
        String status,
        OffsetDateTime assignedDateTime,
        OffsetDateTime dueDateTime,
        String webUrl
) {
    public MicrosoftEducationAssignment {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationAssignment sem id.");
        }
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationAssignment sem displayName.");
        }
    }
}
