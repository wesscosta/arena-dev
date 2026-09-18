package br.com.arenadev.integration.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class IntegrationConnection {
    private final UUID id;
    private final LearningPlatformProvider provider;
    private String displayName;
    private String externalTenantId;
    private String credentialReference;
    private IntegrationConnectionStatus status;
    private final Instant createdAt;
    private Instant updatedAt;

    public IntegrationConnection(
            UUID id,
            LearningPlatformProvider provider,
            String displayName,
            String externalTenantId,
            String credentialReference,
            IntegrationConnectionStatus status,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "id é obrigatório.");
        this.provider = Objects.requireNonNull(provider, "provider é obrigatório.");
        this.displayName = required(displayName, "displayName");
        this.externalTenantId = clean(externalTenantId);
        this.credentialReference = clean(credentialReference);
        this.status = Objects.requireNonNull(status, "status é obrigatório.");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt é obrigatório.");
        this.updatedAt = createdAt;
    }

    public static IntegrationConnection draft(
            LearningPlatformProvider provider,
            String displayName,
            String externalTenantId
    ) {
        return new IntegrationConnection(
                UUID.randomUUID(),
                provider,
                displayName,
                externalTenantId,
                null,
                IntegrationConnectionStatus.DRAFT,
                Instant.now()
        );
    }

    public void attachCredentialReference(String credentialReference, Instant when) {
        this.credentialReference = required(credentialReference, "credentialReference");
        this.updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void activate(Instant when) {
        if (credentialReference == null) {
            throw new IllegalStateException("Conexão não pode ser ativada sem referência de credencial.");
        }
        this.status = IntegrationConnectionStatus.ACTIVE;
        this.updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void disable(Instant when) {
        this.status = IntegrationConnectionStatus.DISABLED;
        this.updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public UUID id() { return id; }
    public LearningPlatformProvider provider() { return provider; }
    public String displayName() { return displayName; }
    public String externalTenantId() { return externalTenantId; }
    public String credentialReference() { return credentialReference; }
    public IntegrationConnectionStatus status() { return status; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String required(String value, String field) {
        String cleaned = clean(value);
        if (cleaned == null) throw new IllegalArgumentException(field + " é obrigatório.");
        return cleaned;
    }
}
