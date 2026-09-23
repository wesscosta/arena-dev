package br.com.arenadev.integration.api;

import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.provider.google.*;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/google")
public class GoogleClassroomIntegrationController {
    private final GoogleClassroomSettings settings;
    private final GoogleCourseDiscoveryService discovery;
    public GoogleClassroomIntegrationController(GoogleClassroomSettings settings,GoogleCourseDiscoveryService discovery){this.settings=settings;this.discovery=discovery;}
    @GetMapping("/readiness")
    public GoogleReadinessResponse readiness(){return new GoogleReadinessResponse(LearningPlatformProvider.GOOGLE_CLASSROOM,settings.oauthConfigured());}
    @GetMapping("/connections/{connectionId}/courses")
    public GoogleCourseDiscoveryService.DiscoveryResult courses(@PathVariable UUID connectionId){return discovery.discover(connectionId);}
    public record GoogleReadinessResponse(LearningPlatformProvider provider,boolean delegatedOAuthConfigured){}
}
