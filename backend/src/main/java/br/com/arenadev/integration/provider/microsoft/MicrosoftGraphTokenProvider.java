package br.com.arenadev.integration.provider.microsoft;

public interface MicrosoftGraphTokenProvider {
    MicrosoftGraphAccessToken acquire(String tenantId);
}
