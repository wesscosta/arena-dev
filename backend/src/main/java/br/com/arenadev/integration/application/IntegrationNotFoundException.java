package br.com.arenadev.integration.application;

public class IntegrationNotFoundException extends RuntimeException {
    public IntegrationNotFoundException(String message) {
        super(message);
    }
}
