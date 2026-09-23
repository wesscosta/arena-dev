package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class MicrosoftTeamsAdapter implements LearningPlatformAdapter {
    private static final Set<LearningPlatformCapability> CAPABILITIES = Set.of(
            LearningPlatformCapability.READ_CLASSROOM,
            LearningPlatformCapability.READ_ROSTER,
            LearningPlatformCapability.READ_ACTIVITY,
            LearningPlatformCapability.READ_SUBMISSIONS,
            LearningPlatformCapability.WRITE_GRADE,
            LearningPlatformCapability.WRITE_FEEDBACK
    );

    @Override
    public LearningPlatformProvider provider() {
        return LearningPlatformProvider.MICROSOFT_TEAMS;
    }

    @Override
    public Set<LearningPlatformCapability> capabilities(IntegrationConnection connection) {
        return CAPABILITIES;
    }
}
