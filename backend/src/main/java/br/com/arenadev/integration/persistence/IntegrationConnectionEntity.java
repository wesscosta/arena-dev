package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "integration_connections")
public class IntegrationConnectionEntity {
    @Id private UUID id;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private LearningPlatformProvider provider;
    @Column(name = "display_name", nullable = false, length = 160) private String displayName;
    @Column(name = "external_tenant_id", length = 255) private String externalTenantId;
    @Column(name = "credential_reference", length = 500) private String credentialReference;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private IntegrationConnectionStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected IntegrationConnectionEntity() {}

    public IntegrationConnectionEntity(UUID id, LearningPlatformProvider provider, String displayName,
                                       String externalTenantId, String credentialReference,
                                       IntegrationConnectionStatus status, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.provider = Objects.requireNonNull(provider);
        this.displayName = required(displayName);
        this.externalTenantId = clean(externalTenantId);
        this.credentialReference = clean(credentialReference);
        this.status = Objects.requireNonNull(status);
        this.createdAt = Objects.requireNonNull(now);
        this.updatedAt = now;
    }

    public void attachCredentialReference(String reference, Instant now) {
        this.credentialReference = required(reference);
        this.updatedAt = Objects.requireNonNull(now);
    }

    public void activate(Instant now) {
        if (credentialReference == null) throw new IllegalStateException("Conexão sem credencial.");
        this.status = IntegrationConnectionStatus.ACTIVE;
        this.updatedAt = Objects.requireNonNull(now);
    }

    public void disable(Instant now) {
        this.status = IntegrationConnectionStatus.DISABLED;
        this.updatedAt = Objects.requireNonNull(now);
    }

    private static String clean(String v) { return v == null || v.isBlank() ? null : v.trim(); }
    private static String required(String v) {
        String clean = clean(v);
        if (clean == null) throw new IllegalArgumentException("Valor obrigatório.");
        return clean;
    }

    public UUID getId() { return id; }
    public LearningPlatformProvider getProvider() { return provider; }
    public String getDisplayName() { return displayName; }
    public String getExternalTenantId() { return externalTenantId; }
    public String getCredentialReference() { return credentialReference; }
    public IntegrationConnectionStatus getStatus() { return status; }
    public Instant getUpdatedAt() { return updatedAt; }
}
