package br.com.arenadev.integration.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record SyncCheckpoint(
        UUID connectionId,
        String scope,
        String cursor,
        Instant updatedAt
) {
    public SyncCheckpoint {
        Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        scope = required(scope, "scope");
        cursor = required(cursor, "cursor");
        Objects.requireNonNull(updatedAt, "updatedAt é obrigatório.");
    }

    private static String required(String value, String field) {
        String cleaned = value == null || value.isBlank() ? null : value.trim();
        if (cleaned == null) throw new IllegalArgumentException(field + " é obrigatório.");
        return cleaned;
    }
}
