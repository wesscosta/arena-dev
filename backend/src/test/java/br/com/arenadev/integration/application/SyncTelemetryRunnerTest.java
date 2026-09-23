package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.persistence.SyncExecutionEntity;
import br.com.arenadev.integration.persistence.SyncItemEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SyncTelemetryRunnerTest {

    @Test
    void marksSuccess() {
        var store = mock(SyncTelemetryStore.class);
        var runner = new SyncTelemetryRunner(store);

        UUID connectionId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        var execution = new SyncExecutionEntity(
                executionId,
                connectionId,
                "ROSTER",
                SyncDirection.IMPORT,
                Instant.now()
        );
        var item = new SyncItemEntity(
                itemId,
                executionId,
                "CLASSROOM",
                "class-1",
                Instant.now()
        );

        when(store.begin(connectionId, "ROSTER", SyncDirection.IMPORT))
                .thenReturn(execution);
        when(store.beginItem(executionId, "CLASSROOM", "class-1"))
                .thenReturn(item);

        assertThat(runner.run(
                connectionId,
                "ROSTER",
                SyncDirection.IMPORT,
                "CLASSROOM",
                "class-1",
                () -> "ok"
        )).isEqualTo("ok");

        verify(store).succeed(executionId, itemId);
        verify(store, never()).fail(any(), any(), anyString());
    }

    @Test
    void persistsFailureAndRethrowsOriginalError() {
        var store = mock(SyncTelemetryStore.class);
        var runner = new SyncTelemetryRunner(store);

        UUID connectionId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        var execution = new SyncExecutionEntity(
                executionId,
                connectionId,
                "SUBMISSIONS",
                SyncDirection.IMPORT,
                Instant.now()
        );
        var item = new SyncItemEntity(
                itemId,
                executionId,
                "ACTIVITY",
                "activity-1",
                Instant.now()
        );

        when(store.begin(connectionId, "SUBMISSIONS", SyncDirection.IMPORT))
                .thenReturn(execution);
        when(store.beginItem(executionId, "ACTIVITY", "activity-1"))
                .thenReturn(item);

        var error = new IllegalStateException("Graph indisponível");

        assertThatThrownBy(() -> runner.run(
                connectionId,
                "SUBMISSIONS",
                SyncDirection.IMPORT,
                "ACTIVITY",
                "activity-1",
                () -> { throw error; }
        )).isSameAs(error);

        verify(store).fail(executionId, itemId, "Graph indisponível");
        verify(store, never()).succeed(any(), any());
    }
}
