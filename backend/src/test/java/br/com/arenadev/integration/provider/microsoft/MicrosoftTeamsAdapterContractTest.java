package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.provider.LearningPlatformAdapterContract;

import java.util.Set;

class MicrosoftTeamsAdapterContractTest extends LearningPlatformAdapterContract {
    private final LearningPlatformAdapter adapter = new MicrosoftTeamsAdapter();

    @Override
    protected LearningPlatformAdapter adapter() {
        return adapter;
    }

    @Override
    protected LearningPlatformProvider provider() {
        return LearningPlatformProvider.MICROSOFT_TEAMS;
    }

    @Override
    protected Set<LearningPlatformCapability> expectedCapabilities() {
        return Set.of(
                LearningPlatformCapability.READ_CLASSROOM,
                LearningPlatformCapability.READ_ROSTER,
                LearningPlatformCapability.READ_ACTIVITY,
                LearningPlatformCapability.READ_SUBMISSIONS,
                LearningPlatformCapability.WRITE_GRADE,
                LearningPlatformCapability.WRITE_FEEDBACK
        );
    }
}
