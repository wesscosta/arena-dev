package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.persistence.SyncExecutionEntity;
import br.com.arenadev.integration.persistence.SyncItemEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SyncTelemetryStore {
    private final SyncExecutionService sync;

    public SyncTelemetryStore(SyncExecutionService sync) {
        this.sync = sync;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncExecutionEntity begin(UUID connectionId, String scope, SyncDirection direction) {
        var execution = sync.beginNew(connectionId, scope, direction);
        return sync.start(execution.getId());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncItemEntity beginItem(UUID executionId, String itemType, String itemKey) {
        var item = sync.registerItem(executionId, itemType, itemKey);
        return sync.startItem(item.getId());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void succeed(UUID executionId, UUID itemId) {
        sync.succeedItem(itemId);
        sync.succeed(executionId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(UUID executionId, UUID itemId, String message) {
        sync.failItem(itemId, message);
        sync.fail(executionId, message);
    }
}
