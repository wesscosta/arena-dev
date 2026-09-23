package br.com.arenadev.integration.domain;

import java.util.Objects;
import java.util.UUID;

public record ExternalSubmissionLink(
        UUID id,
        UUID connectionId,
        UUID externalActivityLinkId,
        UUID externalStudentLinkId,
        UUID submissionId,
        String externalSubmissionId
) {
    public ExternalSubmissionLink {
        Objects.requireNonNull(id, "id é obrigatório.");
        Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        Objects.requireNonNull(externalActivityLinkId, "externalActivityLinkId é obrigatório.");
        Objects.requireNonNull(submissionId, "submissionId é obrigatório.");
        externalSubmissionId = required(externalSubmissionId);
    }

    private static String required(String value) {
        String cleaned = value == null || value.isBlank() ? null : value.trim();
        if (cleaned == null) throw new IllegalArgumentException("externalSubmissionId é obrigatório.");
        return cleaned;
    }
}
