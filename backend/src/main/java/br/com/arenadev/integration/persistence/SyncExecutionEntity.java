package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sync_executions")
public class SyncExecutionEntity {
    @Id private UUID id;
    @Column(name = "connection_id", nullable = false) private UUID connectionId;
    @Column(nullable = false, length = 80) private String scope;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private SyncDirection direction;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private SyncExecutionStatus status;
    @Column(name = "error_summary", columnDefinition = "text") private String errorSummary;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "finished_at") private Instant finishedAt;
    @Version @Column(nullable = false) private long version;

    protected SyncExecutionEntity() {}

    public SyncExecutionEntity(UUID id, UUID connectionId, String scope, SyncDirection direction, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.connectionId = Objects.requireNonNull(connectionId);
        this.scope = required(scope);
        this.direction = Objects.requireNonNull(direction);
        this.status = SyncExecutionStatus.PENDING;
        this.createdAt = Objects.requireNonNull(now);
    }

    public void start(Instant now) {
        require(SyncExecutionStatus.PENDING);
        status = SyncExecutionStatus.RUNNING;
        startedAt = now;
    }
    public void succeed(Instant now) { require(SyncExecutionStatus.RUNNING); status = SyncExecutionStatus.SUCCEEDED; finishedAt = now; }
    public void partiallySucceed(String summary, Instant now) { require(SyncExecutionStatus.RUNNING); status = SyncExecutionStatus.PARTIALLY_SUCCEEDED; errorSummary = summary; finishedAt = now; }
    public void fail(String summary, Instant now) { require(SyncExecutionStatus.RUNNING); status = SyncExecutionStatus.FAILED; errorSummary = required(summary); finishedAt = now; }
    public void cancel(Instant now) {
        if (status != SyncExecutionStatus.PENDING && status != SyncExecutionStatus.RUNNING) throw new IllegalStateException("Execução já finalizada.");
        status = SyncExecutionStatus.CANCELLED; finishedAt = now;
    }
    private void require(SyncExecutionStatus expected) { if (status != expected) throw new IllegalStateException("Estado inválido: " + status); }
    private static String required(String v) { if (v == null || v.isBlank()) throw new IllegalArgumentException("Valor obrigatório."); return v.trim(); }

    public UUID getId() { return id; }
    public UUID getConnectionId() { return connectionId; }
    public String getScope() { return scope; }
    public SyncDirection getDirection() { return direction; }
    public SyncExecutionStatus getStatus() { return status; }
}
