package br.com.arenadev.integration.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class SyncExecution {
    private final UUID id;
    private final UUID connectionId;
    private final String scope;
    private final SyncDirection direction;
    private SyncExecutionStatus status;
    private final Instant createdAt;
    private Instant startedAt;
    private Instant finishedAt;
    private String errorSummary;

    public SyncExecution(UUID id, UUID connectionId, String scope, SyncDirection direction, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id é obrigatório.");
        this.connectionId = Objects.requireNonNull(connectionId, "connectionId é obrigatório.");
        this.scope = required(scope, "scope");
        this.direction = Objects.requireNonNull(direction, "direction é obrigatório.");
        this.status = SyncExecutionStatus.PENDING;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt é obrigatório.");
    }

    public void start(Instant when) {
        requireStatus(SyncExecutionStatus.PENDING);
        status = SyncExecutionStatus.RUNNING;
        startedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void succeed(Instant when) {
        requireStatus(SyncExecutionStatus.RUNNING);
        status = SyncExecutionStatus.SUCCEEDED;
        finishedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void partiallySucceed(String summary, Instant when) {
        requireStatus(SyncExecutionStatus.RUNNING);
        status = SyncExecutionStatus.PARTIALLY_SUCCEEDED;
        errorSummary = clean(summary);
        finishedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void fail(String summary, Instant when) {
        requireStatus(SyncExecutionStatus.RUNNING);
        status = SyncExecutionStatus.FAILED;
        errorSummary = required(summary, "summary");
        finishedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public void cancel(Instant when) {
        if (status != SyncExecutionStatus.PENDING && status != SyncExecutionStatus.RUNNING) {
            throw new IllegalStateException("Somente sincronização pendente ou em execução pode ser cancelada.");
        }
        status = SyncExecutionStatus.CANCELLED;
        finishedAt = Objects.requireNonNull(when, "when é obrigatório.");
    }

    public UUID id() { return id; }
    public UUID connectionId() { return connectionId; }
    public String scope() { return scope; }
    public SyncDirection direction() { return direction; }
    public SyncExecutionStatus status() { return status; }
    public Instant createdAt() { return createdAt; }
    public Instant startedAt() { return startedAt; }
    public Instant finishedAt() { return finishedAt; }
    public String errorSummary() { return errorSummary; }

    private void requireStatus(SyncExecutionStatus expected) {
        if (status != expected) throw new IllegalStateException("Estado atual inválido para a operação: " + status);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String required(String value, String field) {
        String cleaned = clean(value);
        if (cleaned == null) throw new IllegalArgumentException(field + " é obrigatório.");
        return cleaned;
    }
}
