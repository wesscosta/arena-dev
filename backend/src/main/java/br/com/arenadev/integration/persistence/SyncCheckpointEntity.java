package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sync_checkpoints")
public class SyncCheckpointEntity {
    @EmbeddedId private SyncCheckpointKey id;
    @Column(nullable = false, columnDefinition = "text") private String cursor;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;
    protected SyncCheckpointEntity() {}
    public SyncCheckpointKey getId() { return id; }
}
