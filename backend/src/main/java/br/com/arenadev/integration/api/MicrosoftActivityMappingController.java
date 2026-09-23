package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftActivityMappingService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftActivityMappingController {
    private final MicrosoftActivityMappingService service;

    public MicrosoftActivityMappingController(
            MicrosoftActivityMappingService service
    ) {
        this.service = service;
    }

    @GetMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-mapping"
    )
    public MicrosoftActivityMappingService.DiscoveryResult discover(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId
    ) {
        return service.discover(connectionId, classroomLinkId);
    }

    @PostMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-mapping"
    )
    public MicrosoftActivityMappingService.Mapping link(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @RequestBody LinkActivityRequest request
    ) {
        return service.link(
                connectionId,
                classroomLinkId,
                request.activityId(),
                request.microsoftAssignmentId()
        );
    }

    public record LinkActivityRequest(
            UUID activityId,
            String microsoftAssignmentId
    ) {}
}
