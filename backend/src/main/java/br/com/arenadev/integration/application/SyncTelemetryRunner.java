package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.SyncDirection;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.function.Supplier;

@Service
public class SyncTelemetryRunner {
    private final SyncTelemetryStore store;

    public SyncTelemetryRunner(SyncTelemetryStore store) {
        this.store = store;
    }

    public <T> T run(
            UUID connectionId,
            String scope,
            SyncDirection direction,
            String itemType,
            String itemKey,
            Supplier<T> operation
    ) {
        var execution = store.begin(connectionId, scope, direction);
        var item = store.beginItem(execution.getId(), itemType, itemKey);

        try {
            T result = operation.get();
            store.succeed(execution.getId(), item.getId());
            return result;
        } catch (RuntimeException error) {
            store.fail(execution.getId(), item.getId(), message(error));
            throw error;
        }
    }

    private static String message(RuntimeException error) {
        String value = error.getMessage();
        if (value == null || value.isBlank()) return error.getClass().getSimpleName();
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }
}
