package br.com.arenadev.integration.application;

public class IntegrationConflictException extends IllegalStateException {
    public IntegrationConflictException(String message) {
        super(message);
    }
}
