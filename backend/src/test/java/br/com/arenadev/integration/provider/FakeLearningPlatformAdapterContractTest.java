package br.com.arenadev.integration.provider;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.LearningPlatformProvider;

import java.util.Set;

class FakeLearningPlatformAdapterContractTest extends LearningPlatformAdapterContract {
    private final Set<LearningPlatformCapability> capabilities = Set.of(
            LearningPlatformCapability.READ_CLASSROOM,
            LearningPlatformCapability.READ_ROSTER,
            LearningPlatformCapability.READ_ACTIVITY,
            LearningPlatformCapability.READ_SUBMISSIONS,
            LearningPlatformCapability.WRITE_GRADE,
            LearningPlatformCapability.WRITE_FEEDBACK
    );

    private final LearningPlatformAdapter adapter = new FakeLearningPlatformAdapter(
            LearningPlatformProvider.MICROSOFT_TEAMS,
            capabilities
    );

    @Override protected LearningPlatformAdapter adapter() { return adapter; }
    @Override protected LearningPlatformProvider provider() { return LearningPlatformProvider.MICROSOFT_TEAMS; }
    @Override protected Set<LearningPlatformCapability> expectedCapabilities() { return capabilities; }
}
