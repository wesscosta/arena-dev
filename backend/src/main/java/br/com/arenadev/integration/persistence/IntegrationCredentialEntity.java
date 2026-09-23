package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "integration_credentials")
public class IntegrationCredentialEntity {
    @Id
    @Column(name = "connection_id")
    private UUID connectionId;

    @Column(name = "encrypted_access_token", columnDefinition = "text")
    private String encryptedAccessToken;

    @Column(name = "encrypted_refresh_token", columnDefinition = "text")
    private String encryptedRefreshToken;

    @Column(name = "access_token_expires_at")
    private OffsetDateTime accessTokenExpiresAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected IntegrationCredentialEntity() {}

    public IntegrationCredentialEntity(
            UUID connectionId,
            String encryptedAccessToken,
            String encryptedRefreshToken,
            OffsetDateTime accessTokenExpiresAt,
            OffsetDateTime updatedAt
    ) {
        this.connectionId = connectionId;
        this.encryptedAccessToken = encryptedAccessToken;
        this.encryptedRefreshToken = encryptedRefreshToken;
        this.accessTokenExpiresAt = accessTokenExpiresAt;
        this.updatedAt = updatedAt;
    }

    public void update(
            String encryptedAccessToken,
            String encryptedRefreshToken,
            OffsetDateTime accessTokenExpiresAt,
            OffsetDateTime updatedAt
    ) {
        this.encryptedAccessToken = encryptedAccessToken;
        this.encryptedRefreshToken = encryptedRefreshToken;
        this.accessTokenExpiresAt = accessTokenExpiresAt;
        this.updatedAt = updatedAt;
    }

    public UUID getConnectionId() { return connectionId; }
    public String getEncryptedAccessToken() { return encryptedAccessToken; }
    public String getEncryptedRefreshToken() { return encryptedRefreshToken; }
    public OffsetDateTime getAccessTokenExpiresAt() { return accessTokenExpiresAt; }
}
