package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.IntegrationHealthStatus;
import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import br.com.arenadev.integration.domain.SyncItemStatus;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import br.com.arenadev.integration.persistence.SyncExecutionEntity;
import br.com.arenadev.integration.persistence.SyncExecutionRepository;
import br.com.arenadev.integration.persistence.SyncItemEntity;
import br.com.arenadev.integration.persistence.SyncItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class IntegrationObservabilityService {
    private static final Duration STALE_EXECUTION_AFTER = Duration.ofMinutes(30);

    private final IntegrationConnectionRepository connections;
    private final SyncExecutionRepository executions;
    private final SyncItemRepository items;

    public IntegrationObservabilityService(
            IntegrationConnectionRepository connections,
            SyncExecutionRepository executions,
            SyncItemRepository items
    ) {
        this.connections = connections;
        this.executions = executions;
        this.items = items;
    }

    public Overview overview(UUID connectionId) {
        if (!connections.existsById(connectionId)) {
            throw new IntegrationNotFoundException("Conexão não encontrada: " + connectionId);
        }

        List<ExecutionView> recent = executions
                .findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId)
                .stream()
                .map(this::toView)
                .toList();

        long failedExecutions = recent.stream()
                .filter(item -> item.status() == SyncExecutionStatus.FAILED)
                .count();
        long partialExecutions = recent.stream()
                .filter(item -> item.status() == SyncExecutionStatus.PARTIALLY_SUCCEEDED)
                .count();
        long runningExecutions = recent.stream()
                .filter(item -> item.status() == SyncExecutionStatus.PENDING
                        || item.status() == SyncExecutionStatus.RUNNING)
                .count();
        long failedItems = recent.stream().mapToLong(ExecutionView::failedItems).sum();

        Instant lastSuccessAt = executions
                .findFirstByConnectionIdAndStatusOrderByFinishedAtDesc(
                        connectionId,
                        SyncExecutionStatus.SUCCEEDED
                )
                .map(SyncExecutionEntity::getFinishedAt)
                .orElse(null);

        return new Overview(connectionId, health(recent, Instant.now()), recent.size(), failedExecutions,
                partialExecutions, runningExecutions, failedItems, lastSuccessAt, recent);
    }

    private ExecutionView toView(SyncExecutionEntity execution) {
        List<SyncItemEntity> executionItems =
                items.findByExecutionIdOrderByUpdatedAtDesc(execution.getId());

        long succeeded = executionItems.stream()
                .filter(item -> item.getStatus() == SyncItemStatus.SUCCEEDED).count();
        long failed = executionItems.stream()
                .filter(item -> item.getStatus() == SyncItemStatus.FAILED).count();
        long skipped = executionItems.stream()
                .filter(item -> item.getStatus() == SyncItemStatus.SKIPPED).count();

        List<ItemView> failures = executionItems.stream()
                .filter(item -> item.getStatus() == SyncItemStatus.FAILED)
                .map(item -> new ItemView(item.getId(), item.getItemType(), item.getItemKey(),
                        item.getStatus(), item.getErrorMessage(), item.getUpdatedAt()))
                .toList();

        return new ExecutionView(execution.getId(), execution.getScope(), execution.getDirection(),
                execution.getStatus(), execution.getCreatedAt(), execution.getStartedAt(),
                execution.getFinishedAt(), execution.getErrorSummary(), executionItems.size(),
                succeeded, failed, skipped, failures);
    }

    private static IntegrationHealthStatus health(
            List<ExecutionView> recent,
            Instant now
    ) {
        if (recent.isEmpty()) return IntegrationHealthStatus.NO_HISTORY;

        boolean activeExecution = recent.stream().anyMatch(item ->
                isActive(item.status()) && !isStale(item, now)
        );
        if (activeExecution) return IntegrationHealthStatus.SYNCING;

        ExecutionView latest = recent.getFirst();

        if (latest.status() == SyncExecutionStatus.FAILED) {
            return IntegrationHealthStatus.ERROR;
        }

        if (latest.status() == SyncExecutionStatus.CANCELLED
                || isStale(latest, now)
                || latest.status() == SyncExecutionStatus.PARTIALLY_SUCCEEDED
                || latest.failedItems() > 0) {
            return IntegrationHealthStatus.ATTENTION;
        }

        return IntegrationHealthStatus.HEALTHY;
    }

    private static boolean isActive(SyncExecutionStatus status) {
        return status == SyncExecutionStatus.PENDING
                || status == SyncExecutionStatus.RUNNING;
    }

    private static boolean isStale(ExecutionView execution, Instant now) {
        if (!isActive(execution.status())) return false;

        Instant reference = execution.startedAt() != null
                ? execution.startedAt()
                : execution.createdAt();

        return reference.isBefore(now.minus(STALE_EXECUTION_AFTER));
    }

    public record Overview(UUID connectionId, IntegrationHealthStatus health, int recentExecutions,
            long failedExecutions, long partialExecutions, long runningExecutions, long failedItems,
            Instant lastSuccessAt, List<ExecutionView> executions) {}

    public record ExecutionView(UUID id, String scope, SyncDirection direction, SyncExecutionStatus status,
            Instant createdAt, Instant startedAt, Instant finishedAt, String errorSummary,
            int totalItems, long succeededItems, long failedItems, long skippedItems,
            List<ItemView> failures) {}

    public record ItemView(UUID id, String itemType, String itemKey, SyncItemStatus status,
            String errorMessage, Instant updatedAt) {}
}
