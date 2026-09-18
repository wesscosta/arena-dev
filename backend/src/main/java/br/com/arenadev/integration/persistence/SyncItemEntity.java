package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncItemStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sync_items")
public class SyncItemEntity {
    @Id private UUID id;
    @Column(name = "execution_id", nullable = false) private UUID executionId;
    @Column(name = "item_type", nullable = false, length = 80) private String itemType;
    @Column(name = "item_key", nullable = false, length = 500) private String itemKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private SyncItemStatus status;
    @Column(name = "error_message", columnDefinition = "text") private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected SyncItemEntity() {}

    public SyncItemEntity(UUID id, UUID executionId, String itemType, String itemKey, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.executionId = Objects.requireNonNull(executionId);
        this.itemType = required(itemType);
        this.itemKey = required(itemKey);
        this.status = SyncItemStatus.PENDING;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void start(Instant now) { require(SyncItemStatus.PENDING); status = SyncItemStatus.RUNNING; updatedAt = now; }
    public void succeed(Instant now) { require(SyncItemStatus.RUNNING); status = SyncItemStatus.SUCCEEDED; errorMessage = null; updatedAt = now; }
    public void fail(String message, Instant now) { require(SyncItemStatus.RUNNING); status = SyncItemStatus.FAILED; errorMessage = required(message); updatedAt = now; }
    public void skip(Instant now) {
        if (status != SyncItemStatus.PENDING && status != SyncItemStatus.RUNNING) throw new IllegalStateException("Item já finalizado.");
        status = SyncItemStatus.SKIPPED; updatedAt = now;
    }
    private void require(SyncItemStatus expected) { if (status != expected) throw new IllegalStateException("Estado inválido: " + status); }
    private static String required(String v) { if (v == null || v.isBlank()) throw new IllegalArgumentException("Valor obrigatório."); return v.trim(); }

    public UUID getId() { return id; }
    public UUID getExecutionId() { return executionId; }
    public String getItemType() { return itemType; }
    public String getItemKey() { return itemKey; }
    public SyncItemStatus getStatus() { return status; }
}
