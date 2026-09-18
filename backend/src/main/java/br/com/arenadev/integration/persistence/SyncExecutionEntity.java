package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import jakarta.persistence.*;
import java.time.Instant;
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
    public UUID getId() { return id; }
}
