package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionTrackingService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftSubmissionTrackingController {
    private final MicrosoftSubmissionTrackingService service;

    public MicrosoftSubmissionTrackingController(
            MicrosoftSubmissionTrackingService service
    ) {
        this.service = service;
    }

    @GetMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-links/{activityLinkId}/submissions"
    )
    public MicrosoftSubmissionTrackingService.TrackingResult track(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @PathVariable UUID activityLinkId
    ) {
        return service.track(connectionId, classroomLinkId, activityLinkId);
    }
}
