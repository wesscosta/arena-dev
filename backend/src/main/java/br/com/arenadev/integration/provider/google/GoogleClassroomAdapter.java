package br.com.arenadev.integration.provider.google;

import br.com.arenadev.integration.application.port.*;
import br.com.arenadev.integration.domain.*;
import org.springframework.stereotype.Component;
import java.util.Set;

@Component
public class GoogleClassroomAdapter implements LearningPlatformAdapter {
    public LearningPlatformProvider provider(){ return LearningPlatformProvider.GOOGLE_CLASSROOM; }
    public Set<LearningPlatformCapability> capabilities(IntegrationConnection connection){ return Set.of(LearningPlatformCapability.READ_CLASSROOM); }
}
