package br.com.arenadev.integration.provider.microsoft;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MicrosoftEducationOutcome(
        String id,
        String type,
        BigDecimal points,
        BigDecimal publishedPoints,
        String feedback,
        String publishedFeedback,
        OffsetDateTime lastModifiedDateTime
) {
    public MicrosoftEducationOutcome {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationOutcome sem id.");
        }
    }
}
