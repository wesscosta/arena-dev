package br.com.arenadev.integration.domain;

public enum SyncExecutionStatus {
    PENDING,
    RUNNING,
    PARTIALLY_SUCCEEDED,
    SUCCEEDED,
    FAILED,
    CANCELLED
}
