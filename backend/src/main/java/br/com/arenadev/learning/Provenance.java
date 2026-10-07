package br.com.arenadev.learning;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record Provenance(
        ProvenanceOrigin origin,
        String sourceRef,
        UUID createdBy,
        UUID reviewedBy,
        Instant createdAt
) {
    public Provenance {
        origin = Objects.requireNonNull(origin, "A origem é obrigatória.");
        sourceRef = normalizeOptional(sourceRef);
        createdAt = Objects.requireNonNull(createdAt, "A data de criação da proveniência é obrigatória.");
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
