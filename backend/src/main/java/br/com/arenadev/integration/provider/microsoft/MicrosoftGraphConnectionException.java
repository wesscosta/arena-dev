package br.com.arenadev.integration.provider.microsoft;

public class MicrosoftGraphConnectionException extends IllegalStateException {
    public MicrosoftGraphConnectionException(String message) {
        super(message);
    }

    public MicrosoftGraphConnectionException(String message, Throwable cause) {
        super(message, cause);
    }
}
