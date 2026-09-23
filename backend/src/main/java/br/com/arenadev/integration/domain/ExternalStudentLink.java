package br.com.arenadev.integration.domain;

import java.util.Objects;
import java.util.UUID;

public record ExternalStudentLink(
        UUID id,
        UUID connectionId,
        UUID externalClassroomLinkId,
        UUID enrollmentId,
        String externalUserId
) {
    public ExternalStudentLink {
        Objects.requireNonNull(id, "id é obrigatório.");
        Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        Objects.requireNonNull(externalClassroomLinkId, "externalClassroomLinkId é obrigatório.");
        Objects.requireNonNull(enrollmentId, "enrollmentId é obrigatório.");
        externalUserId = required(externalUserId);
    }

    private static String required(String value) {
        String cleaned = value == null || value.isBlank() ? null : value.trim();
        if (cleaned == null) throw new IllegalArgumentException("externalUserId é obrigatório.");
        return cleaned;
    }
}
