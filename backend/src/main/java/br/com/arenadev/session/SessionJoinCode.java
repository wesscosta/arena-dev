package br.com.arenadev.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_join_codes")
public class SessionJoinCode {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private ClassSession session;

    @Column(nullable = false, unique = true, length = 8)
    private String code;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SessionJoinCode() {
    }

    public SessionJoinCode(ClassSession session, String code, Instant expiresAt) {
        this.session = session;
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public String getCode() { return code; }
    public boolean isActive() { return active; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isUsableAt(Instant instant) {
        return active && expiresAt.isAfter(instant) && session.getStatus() == SessionStatus.ACTIVE;
    }

    public void deactivate() {
        this.active = false;
    }

    public void rotate(String code, Instant expiresAt) {
        this.code = code;
        this.expiresAt = expiresAt;
        this.active = true;
    }
}
