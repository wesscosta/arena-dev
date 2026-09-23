package br.com.arenadev.integration.provider.microsoft;

import java.time.OffsetDateTime;

public record MicrosoftGraphAccessToken(String token, OffsetDateTime expiresAt) {
    public MicrosoftGraphAccessToken {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token Microsoft inválido.");
        }
    }
}
