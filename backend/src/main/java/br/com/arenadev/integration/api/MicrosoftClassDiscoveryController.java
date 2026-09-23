package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftClassDiscoveryService;
import br.com.arenadev.integration.provider.microsoft.MicrosoftEducationClass;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftClassDiscoveryController {
    private final MicrosoftClassDiscoveryService service;

    public MicrosoftClassDiscoveryController(MicrosoftClassDiscoveryService service) { this.service = service; }

    @GetMapping("/connections/{connectionId}/classes")
    public MicrosoftClassDiscoveryResponse discoverClasses(@PathVariable UUID connectionId) {
        var result = service.discover(connectionId);
        return new MicrosoftClassDiscoveryResponse(
                result.connectionId(), result.tenantId(), result.classes().size(), result.classes()
        );
    }

    public record MicrosoftClassDiscoveryResponse(
            UUID connectionId, String tenantId, int count, List<MicrosoftEducationClass> classes
    ) {}
}
