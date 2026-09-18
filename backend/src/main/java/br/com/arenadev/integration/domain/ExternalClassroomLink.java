package br.com.arenadev.integration.domain;

import java.util.Objects;
import java.util.UUID;

public record ExternalClassroomLink(
        UUID id,
        UUID connectionId,
        UUID classroomId,
        String externalClassroomId,
        String externalWebUrl
) {
    public ExternalClassroomLink {
        Objects.requireNonNull(id, "id é obrigatório.");
        Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        Objects.requireNonNull(classroomId, "classroomId é obrigatório.");
        externalClassroomId = required(externalClassroomId, "externalClassroomId");
        externalWebUrl = clean(externalWebUrl);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String required(String value, String field) {
        String cleaned = clean(value);
        if (cleaned == null) throw new IllegalArgumentException(field + " é obrigatório.");
        return cleaned;
    }
}
