package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "sync_checkpoints")
public class SyncCheckpointEntity {
    @EmbeddedId private SyncCheckpointKey id;
    @Column(nullable = false, columnDefinition = "text") private String cursor;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected SyncCheckpointEntity() {}

    public SyncCheckpointEntity(SyncCheckpointKey id, String cursor, Instant now) {
        this.id = Objects.requireNonNull(id);
        setCursor(cursor, now);
    }

    public void setCursor(String cursor, Instant now) {
        if (cursor == null || cursor.isBlank()) throw new IllegalArgumentException("cursor é obrigatório.");
        this.cursor = cursor;
        this.updatedAt = Objects.requireNonNull(now);
    }

    public SyncCheckpointKey getId() { return id; }
    public String getCursor() { return cursor; }
}
