package br.com.arenadev.integration.provider.google;
import br.com.arenadev.integration.application.port.*;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.provider.LearningPlatformAdapterContract;
import java.util.Set;
class GoogleClassroomAdapterContractTest extends LearningPlatformAdapterContract {
    private final LearningPlatformAdapter adapter=new GoogleClassroomAdapter();
    protected LearningPlatformAdapter adapter(){return adapter;}
    protected LearningPlatformProvider provider(){return LearningPlatformProvider.GOOGLE_CLASSROOM;}
    protected Set<LearningPlatformCapability> expectedCapabilities(){return Set.of(LearningPlatformCapability.READ_CLASSROOM);}
}
