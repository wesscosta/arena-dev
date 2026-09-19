package br.com.arenadev.integration.api;

import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import br.com.arenadev.integration.provider.microsoft.MicrosoftIdentityConnectionService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftIntegrationController {
    private final MicrosoftIdentityConnectionService service;

    public MicrosoftIntegrationController(MicrosoftIdentityConnectionService service) {
        this.service = service;
    }

    @GetMapping("/readiness")
    public MicrosoftReadinessResponse readiness() {
        return new MicrosoftReadinessResponse(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                service.configured()
        );
    }

    @PostMapping("/connect")
    public MicrosoftConnectionResponse connect(@RequestBody ConnectMicrosoftRequest request) {
        return MicrosoftConnectionResponse.from(
                service.connect(request.displayName(), request.tenantId())
        );
    }

    public record ConnectMicrosoftRequest(String displayName, String tenantId) {}

    public record MicrosoftReadinessResponse(
            LearningPlatformProvider provider,
            boolean applicationCredentialsConfigured
    ) {}

    public record MicrosoftConnectionResponse(
            UUID id,
            LearningPlatformProvider provider,
            String displayName,
            String tenantId,
            IntegrationConnectionStatus status
    ) {
        static MicrosoftConnectionResponse from(IntegrationConnectionEntity entity) {
            return new MicrosoftConnectionResponse(
                    entity.getId(),
                    entity.getProvider(),
                    entity.getDisplayName(),
                    entity.getExternalTenantId(),
                    entity.getStatus()
            );
        }
    }
}
