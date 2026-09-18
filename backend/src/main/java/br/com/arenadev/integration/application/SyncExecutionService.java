package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import br.com.arenadev.integration.domain.SyncItemStatus;
import br.com.arenadev.integration.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class SyncExecutionService {
    private static final List<SyncExecutionStatus> OPEN =
            List.of(SyncExecutionStatus.PENDING, SyncExecutionStatus.RUNNING);

    private final IntegrationConnectionRepository connections;
    private final SyncExecutionRepository executions;
    private final SyncItemRepository items;
    private final Clock clock;

    @Autowired
    public SyncExecutionService(
            IntegrationConnectionRepository connections,
            SyncExecutionRepository executions,
            SyncItemRepository items
    ) {
        this(connections, executions, items, Clock.systemUTC());
    }

    SyncExecutionService(
            IntegrationConnectionRepository connections,
            SyncExecutionRepository executions,
            SyncItemRepository items,
            Clock clock
    ) {
        this.connections = connections;
        this.executions = executions;
        this.items = items;
        this.clock = clock;
    }

    public SyncExecutionEntity begin(UUID connectionId, String scope, SyncDirection direction) {
        if (!connections.existsById(connectionId)) {
            throw new IntegrationNotFoundException("Conexão não encontrada: " + connectionId);
        }

        return executions
                .findFirstByConnectionIdAndScopeAndDirectionAndStatusInOrderByCreatedAtDesc(
                        connectionId, scope, direction, OPEN
                )
                .orElseGet(() -> executions.save(new SyncExecutionEntity(
                        UUID.randomUUID(), connectionId, scope, direction, now()
                )));
    }

    public SyncExecutionEntity start(UUID executionId) {
        var entity = required(executionId);
        if (entity.getStatus() == SyncExecutionStatus.RUNNING) return entity;
        entity.start(now());
        return executions.save(entity);
    }

    public SyncItemEntity registerItem(UUID executionId, String itemType, String itemKey) {
        required(executionId);
        return items.findByExecutionIdAndItemTypeAndItemKey(executionId, itemType, itemKey)
                .orElseGet(() -> items.save(new SyncItemEntity(
                        UUID.randomUUID(), executionId, itemType, itemKey, now()
                )));
    }

    public SyncItemEntity startItem(UUID itemId) {
        var item = requiredItem(itemId);
        if (item.getStatus() == SyncItemStatus.RUNNING) return item;
        item.start(now());
        return items.save(item);
    }

    public SyncItemEntity succeedItem(UUID itemId) {
        var item = requiredItem(itemId);
        if (item.getStatus() == SyncItemStatus.SUCCEEDED) return item;
        item.succeed(now());
        return items.save(item);
    }

    public SyncItemEntity failItem(UUID itemId, String message) {
        var item = requiredItem(itemId);
        item.fail(message, now());
        return items.save(item);
    }

    public SyncExecutionEntity succeed(UUID executionId) {
        var entity = required(executionId);
        if (entity.getStatus() == SyncExecutionStatus.SUCCEEDED) return entity;
        entity.succeed(now());
        return executions.save(entity);
    }

    public SyncExecutionEntity partiallySucceed(UUID executionId, String summary) {
        var entity = required(executionId);
        entity.partiallySucceed(summary, now());
        return executions.save(entity);
    }

    public SyncExecutionEntity fail(UUID executionId, String summary) {
        var entity = required(executionId);
        entity.fail(summary, now());
        return executions.save(entity);
    }

    public SyncExecutionEntity cancel(UUID executionId) {
        var entity = required(executionId);
        if (entity.getStatus() == SyncExecutionStatus.CANCELLED) return entity;
        entity.cancel(now());
        return executions.save(entity);
    }

    private SyncExecutionEntity required(UUID id) {
        return executions.findById(id)
                .orElseThrow(() -> new IntegrationNotFoundException("Execução não encontrada: " + id));
    }

    private SyncItemEntity requiredItem(UUID id) {
        return items.findById(id)
                .orElseThrow(() -> new IntegrationNotFoundException("Item de sincronização não encontrado: " + id));
    }

    private Instant now() { return clock.instant(); }
}
