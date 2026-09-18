package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncItemStatus;
import jakarta.persistence.*;
import java.time.Instant;
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
    public UUID getId() { return id; }
}
