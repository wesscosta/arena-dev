package br.com.arenadev.integration.api;

import br.com.arenadev.integration.application.IntegrationObservabilityService;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/connections/{connectionId}/observability")
public class IntegrationObservabilityController {
    private final IntegrationObservabilityService observability;
    public IntegrationObservabilityController(IntegrationObservabilityService observability) {
        this.observability = observability;
    }
    @GetMapping
    public IntegrationObservabilityService.Overview overview(@PathVariable UUID connectionId) {
        return observability.overview(connectionId);
    }
}
