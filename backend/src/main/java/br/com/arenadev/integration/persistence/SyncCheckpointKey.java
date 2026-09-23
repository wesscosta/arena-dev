package br.com.arenadev.integration.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class SyncCheckpointKey implements Serializable {
    @Column(name = "connection_id") private UUID connectionId;
    @Column(length = 80) private String scope;

    protected SyncCheckpointKey() {}
    public SyncCheckpointKey(UUID connectionId, String scope) {
        this.connectionId = connectionId;
        this.scope = scope;
    }

    public UUID getConnectionId() { return connectionId; }
    public String getScope() { return scope; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SyncCheckpointKey that)) return false;
        return Objects.equals(connectionId, that.connectionId) && Objects.equals(scope, that.scope);
    }

    @Override public int hashCode() {
        return Objects.hash(connectionId, scope);
    }
}
