package br.com.arenadev.integration.provider;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;

import java.util.Set;

public final class FakeLearningPlatformAdapter implements LearningPlatformAdapter {
    private final LearningPlatformProvider provider;
    private final Set<LearningPlatformCapability> capabilities;

    public FakeLearningPlatformAdapter(
            LearningPlatformProvider provider,
            Set<LearningPlatformCapability> capabilities
    ) {
        this.provider = provider;
        this.capabilities = Set.copyOf(capabilities);
    }

    @Override
    public LearningPlatformProvider provider() {
        return provider;
    }

    @Override
    public Set<LearningPlatformCapability> capabilities(IntegrationConnection connection) {
        return capabilities;
    }
}
