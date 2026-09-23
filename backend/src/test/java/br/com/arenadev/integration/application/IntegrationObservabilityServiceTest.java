package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.IntegrationHealthStatus;
import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class IntegrationObservabilityServiceTest {
    @Test
    void exposesPartialExecutionAndFailedItemsAsAttention() {
        UUID connectionId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);
        Instant created = Instant.parse("2026-09-21T18:00:00Z");
        Instant started = Instant.parse("2026-09-21T18:00:01Z");
        Instant finished = Instant.parse("2026-09-21T18:00:05Z");
        var execution = new SyncExecutionEntity(executionId, connectionId, "SUBMISSIONS", SyncDirection.IMPORT, created);
        execution.start(started);
        execution.partiallySucceed("Uma entrega falhou.", finished);
        var failedItem = new SyncItemEntity(UUID.randomUUID(), executionId, "SUBMISSION", "submission-1", created);
        failedItem.start(started);
        failedItem.fail("Aluno externo sem vínculo local.", finished);
        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId)).thenReturn(List.of(execution));
        when(items.findByExecutionIdOrderByUpdatedAtDesc(executionId)).thenReturn(List.of(failedItem));
        var result = new IntegrationObservabilityService(connections, executions, items).overview(connectionId);
        assertThat(result.health()).isEqualTo(IntegrationHealthStatus.ATTENTION);
        assertThat(result.failedItems()).isEqualTo(1);
        assertThat(result.executions().getFirst().failures()).hasSize(1);
    }

    @Test
    void exposesNoHistoryWithoutExecutions() {
        UUID connectionId = UUID.randomUUID();
        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);
        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId)).thenReturn(List.of());
        var result = new IntegrationObservabilityService(connections, executions, items).overview(connectionId);
        assertThat(result.health()).isEqualTo(IntegrationHealthStatus.NO_HISTORY);
        assertThat(result.recentExecutions()).isZero();
        verifyNoInteractions(items);
    }

    @Test
    void cancelledExecutionRequiresAttention() {
        UUID connectionId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        Instant now = Instant.now();

        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);

        var execution = new SyncExecutionEntity(
                executionId, connectionId, "ROSTER", SyncDirection.IMPORT,
                now.minusSeconds(120)
        );
        execution.cancel(now.minusSeconds(60));

        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId))
                .thenReturn(List.of(execution));
        when(executions.findFirstByConnectionIdAndStatusOrderByFinishedAtDesc(
                connectionId, SyncExecutionStatus.SUCCEEDED
        )).thenReturn(Optional.empty());
        when(items.findByExecutionIdOrderByUpdatedAtDesc(executionId))
                .thenReturn(List.of());

        var result = new IntegrationObservabilityService(
                connections, executions, items
        ).overview(connectionId);

        assertThat(result.health()).isEqualTo(IntegrationHealthStatus.ATTENTION);
    }

    @Test
    void staleRunningExecutionRequiresAttentionInsteadOfSyncingForever() {
        UUID connectionId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        Instant now = Instant.now();

        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);

        var execution = new SyncExecutionEntity(
                executionId, connectionId, "SUBMISSIONS", SyncDirection.IMPORT,
                now.minusSeconds(7200)
        );
        execution.start(now.minusSeconds(7100));

        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId))
                .thenReturn(List.of(execution));
        when(executions.findFirstByConnectionIdAndStatusOrderByFinishedAtDesc(
                connectionId, SyncExecutionStatus.SUCCEEDED
        )).thenReturn(Optional.empty());
        when(items.findByExecutionIdOrderByUpdatedAtDesc(executionId))
                .thenReturn(List.of());

        var result = new IntegrationObservabilityService(
                connections, executions, items
        ).overview(connectionId);

        assertThat(result.health()).isEqualTo(IntegrationHealthStatus.ATTENTION);
    }

    @Test
    void lastSuccessDoesNotDependOnRecentExecutionWindow() {
        UUID connectionId = UUID.randomUUID();
        UUID successId = UUID.randomUUID();
        Instant now = Instant.now();

        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);

        var success = new SyncExecutionEntity(
                successId, connectionId, "ROSTER", SyncDirection.IMPORT,
                now.minusSeconds(86400)
        );
        success.start(now.minusSeconds(86390));
        success.succeed(now.minusSeconds(86380));

        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findTop10ByConnectionIdOrderByCreatedAtDesc(connectionId))
                .thenReturn(List.of());
        when(executions.findFirstByConnectionIdAndStatusOrderByFinishedAtDesc(
                connectionId, SyncExecutionStatus.SUCCEEDED
        )).thenReturn(Optional.of(success));

        var result = new IntegrationObservabilityService(
                connections, executions, items
        ).overview(connectionId);

        assertThat(result.health()).isEqualTo(IntegrationHealthStatus.NO_HISTORY);
        assertThat(result.lastSuccessAt()).isEqualTo(success.getFinishedAt());
        verifyNoInteractions(items);
    }

}
