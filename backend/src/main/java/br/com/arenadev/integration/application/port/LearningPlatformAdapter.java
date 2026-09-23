package br.com.arenadev.integration.application.port;

import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;

import java.util.Set;

public interface LearningPlatformAdapter {
    LearningPlatformProvider provider();
    Set<LearningPlatformCapability> capabilities(IntegrationConnection connection);

    default boolean supports(IntegrationConnection connection, LearningPlatformCapability capability) {
        if (connection.provider() != provider()) {
            return false;
        }
        return capabilities(connection).contains(capability);
    }
}
