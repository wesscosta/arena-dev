package br.com.arenadev.integration.application;

import br.com.arenadev.integration.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SyncCheckpointService {
    private final IntegrationConnectionRepository connections;
    private final SyncCheckpointRepository checkpoints;
    private final Clock clock;

    @Autowired
    public SyncCheckpointService(
            IntegrationConnectionRepository connections,
            SyncCheckpointRepository checkpoints
    ) {
        this(connections, checkpoints, Clock.systemUTC());
    }

    SyncCheckpointService(
            IntegrationConnectionRepository connections,
            SyncCheckpointRepository checkpoints,
            Clock clock
    ) {
        this.connections = connections;
        this.checkpoints = checkpoints;
        this.clock = clock;
    }

    public SyncCheckpointEntity save(UUID connectionId, String scope, String cursor) {
        if (!connections.existsById(connectionId)) {
            throw new IntegrationNotFoundException("Conexão não encontrada: " + connectionId);
        }
        var key = new SyncCheckpointKey(connectionId, scope);
        var existing = checkpoints.findById(key);
        var entity = existing.orElseGet(
                () -> new SyncCheckpointEntity(key, cursor, clock.instant())
        );
        if (existing.isPresent()) {
            entity.setCursor(cursor, clock.instant());
        }
        return checkpoints.save(entity);
    }

    @Transactional(readOnly = true)
    public Optional<SyncCheckpointEntity> find(UUID connectionId, String scope) {
        return checkpoints.findById(new SyncCheckpointKey(connectionId, scope));
    }
}
