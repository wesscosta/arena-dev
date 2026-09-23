package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.LearningPlatformProvider;

public class IntegrationAdapterNotFoundException extends RuntimeException {
    public IntegrationAdapterNotFoundException(LearningPlatformProvider provider) {
        super("Nenhum adapter registrado para o provider: " + provider);
    }
}
