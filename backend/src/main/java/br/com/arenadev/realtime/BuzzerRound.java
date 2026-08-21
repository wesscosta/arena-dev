package br.com.arenadev.realtime;

import br.com.arenadev.session.ClassSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "buzzer_rounds")
public class BuzzerRound {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BuzzerRoundStatus status = BuzzerRoundStatus.OPEN;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt = Instant.now();

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected BuzzerRound() {
    }

    public BuzzerRound(ClassSession session) {
        this.session = session;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public BuzzerRoundStatus getStatus() { return status; }
    public Instant getOpenedAt() { return openedAt; }
    public Instant getClosedAt() { return closedAt; }

    public void close() {
        if (status == BuzzerRoundStatus.OPEN) {
            status = BuzzerRoundStatus.CLOSED;
            closedAt = Instant.now();
        }
    }
}
