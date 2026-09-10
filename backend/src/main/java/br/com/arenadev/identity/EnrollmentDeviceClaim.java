package br.com.arenadev.identity;

import br.com.arenadev.classroom.Enrollment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "enrollment_device_claims")
public class EnrollmentDeviceClaim {
    private static final Duration CLAIM_TTL = Duration.ofDays(180);

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected EnrollmentDeviceClaim() {
    }

    public EnrollmentDeviceClaim(Enrollment enrollment, String tokenHash, Instant now) {
        this.enrollment = enrollment;
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.lastUsedAt = now;
        this.expiresAt = now.plus(CLAIM_TTL);
    }

    public UUID getId() {
        return id;
    }

    public Enrollment getEnrollment() {
        return enrollment;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isUsableAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public void touch(Instant now) {
        this.lastUsedAt = now;
        this.expiresAt = now.plus(CLAIM_TTL);
    }

    public void revoke(Instant now) {
        this.revokedAt = now;
    }
}
