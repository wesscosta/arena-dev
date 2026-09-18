package br.com.arenadev.integration.domain;

import java.util.Objects;
import java.util.UUID;

public record ExternalActivityLink(
        UUID id,
        UUID connectionId,
        UUID externalClassroomLinkId,
        UUID activityId,
        String externalActivityId,
        String externalWebUrl
) {
    public ExternalActivityLink {
        Objects.requireNonNull(id, "id é obrigatório.");
        Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        Objects.requireNonNull(externalClassroomLinkId, "externalClassroomLinkId é obrigatório.");
        Objects.requireNonNull(activityId, "activityId é obrigatório.");
        externalActivityId = required(externalActivityId, "externalActivityId");
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
