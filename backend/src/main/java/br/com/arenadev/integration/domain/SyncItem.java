package br.com.arenadev.integration.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class SyncItem {
    private final UUID id;
    private final UUID executionId;
    private final String itemType;
    private final String itemKey;
    private SyncItemStatus status;
    private String errorMessage;
    private Instant updatedAt;

    public SyncItem(UUID id, UUID executionId, String itemType, String itemKey, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id é obrigatório.");
        this.executionId = Objects.requireNonNull(executionId, "executionId é obrigatório.");
        this.itemType = required(itemType, "itemType");
        this.itemKey = required(itemKey, "itemKey");
        this.status = SyncItemStatus.PENDING;
        this.updatedAt = Objects.requireNonNull(createdAt, "createdAt é obrigatório.");
    }

    public void start(Instant when) {
        requireStatus(SyncItemStatus.PENDING);
        status = SyncItemStatus.RUNNING;
        updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void succeed(Instant when) {
        requireStatus(SyncItemStatus.RUNNING);
        status = SyncItemStatus.SUCCEEDED;
        errorMessage = null;
        updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void fail(String message, Instant when) {
        requireStatus(SyncItemStatus.RUNNING);
        status = SyncItemStatus.FAILED;
        errorMessage = required(message, "message");
        updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void skip(Instant when) {
        if (status != SyncItemStatus.PENDING && status != SyncItemStatus.RUNNING) {
            throw new IllegalStateException("Item já finalizado.");
        }
        status = SyncItemStatus.SKIPPED;
        updatedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public UUID id() { return id; }
    public UUID executionId() { return executionId; }
    public String itemType() { return itemType; }
    public String itemKey() { return itemKey; }
    public SyncItemStatus status() { return status; }
    public String errorMessage() { return errorMessage; }
    public Instant updatedAt() { return updatedAt; }

    private void requireStatus(SyncItemStatus expected) {
        if (status != expected) throw new IllegalStateException("Estado atual inválido para a operação: " + status);
    }

    private static String required(String value, String field) {
        String cleaned = value == null || value.isBlank() ? null : value.trim();
        if (cleaned == null) throw new IllegalArgumentException(field + " é obrigatório.");
        return cleaned;
    }
}
