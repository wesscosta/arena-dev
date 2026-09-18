package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import jakarta.persistence.*;
import java.time.Instant;
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

    public UUID getId() { return id; }
    public LearningPlatformProvider getProvider() { return provider; }
    public String getDisplayName() { return displayName; }
    public String getExternalTenantId() { return externalTenantId; }
    public String getCredentialReference() { return credentialReference; }
    public IntegrationConnectionStatus getStatus() { return status; }
}
