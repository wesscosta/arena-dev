package br.com.arenadev.interaction;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "interaction_runs")
public class InteractionRun {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interaction_definition_id", nullable = false)
    private InteractionDefinition definition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InteractionRunStatus status = InteractionRunStatus.CREATED;

    @Column(nullable = false)
    private int sequence;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "responses_locked_at")
    private Instant responsesLockedAt;

    @Column(name = "results_revealed_at")
    private Instant resultsRevealedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected InteractionRun() {
    }

    public InteractionRun(ClassSession session, InteractionDefinition definition, int sequence) {
        this.session = Objects.requireNonNull(session, "A sessão é obrigatória.");
        this.definition = Objects.requireNonNull(definition, "A definição da interação é obrigatória.");
        if (sequence < 1) {
            throw new IllegalArgumentException("A sequência da interação deve ser positiva.");
        }
        this.sequence = sequence;
    }

    public void open(Instant now) {
        requireTimestamp(now);
        if (status == InteractionRunStatus.ACTIVE) return;
        if (status != InteractionRunStatus.CREATED) {
            throw new IllegalArgumentException("Somente uma interação criada pode ser aberta.");
        }
        status = InteractionRunStatus.ACTIVE;
        openedAt = now;
        touch(now);
    }

    public void lockResponses(Instant now) {
        requireTimestamp(now);
        ensureActive();
        if (responsesLockedAt != null) return;
        responsesLockedAt = now;
        touch(now);
    }

    public void revealResults(Instant now) {
        requireTimestamp(now);
        ensureActive();
        if (resultsRevealedAt != null) return;
        resultsRevealedAt = now;
        touch(now);
    }

    public void close(Instant now) {
        requireTimestamp(now);
        if (status == InteractionRunStatus.CLOSED) return;
        if (status == InteractionRunStatus.CREATED) {
            throw new IllegalArgumentException("Uma interação precisa ser aberta antes de ser encerrada.");
        }
        status = InteractionRunStatus.CLOSED;
        if (responsesLockedAt == null) responsesLockedAt = now;
        closedAt = now;
        touch(now);
    }

    public boolean acceptsResponses() {
        return status == InteractionRunStatus.ACTIVE && responsesLockedAt == null;
    }

    public boolean resultsVisiblePublicly() {
        return resultsRevealedAt != null;
    }

    private void ensureActive() {
        if (status != InteractionRunStatus.ACTIVE) {
            throw new IllegalArgumentException("A interação não está ativa.");
        }
    }

    private static void requireTimestamp(Instant now) {
        Objects.requireNonNull(now, "O instante da transição é obrigatório.");
    }

    private void touch(Instant now) {
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        if (updatedAt == null) updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public InteractionDefinition getDefinition() { return definition; }
    public InteractionRunStatus getStatus() { return status; }
    public int getSequence() { return sequence; }
    public Instant getOpenedAt() { return openedAt; }
    public Instant getResponsesLockedAt() { return responsesLockedAt; }
    public Instant getResultsRevealedAt() { return resultsRevealedAt; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
