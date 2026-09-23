package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionTrackingService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftSubmissionTrackingController {
    private final MicrosoftSubmissionTrackingService service;
    private final br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionImportService importer;

    public MicrosoftSubmissionTrackingController(
            MicrosoftSubmissionTrackingService service,
            br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionImportService importer
    ) {
        this.service = service;
        this.importer = importer;
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

    @PostMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-links/{activityLinkId}/submissions/import"
    )
    public br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionImportService.ImportResult importSubmission(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @PathVariable UUID activityLinkId,
            @RequestBody ImportSubmissionRequest request
    ) {
        return importer.importDelivered(
                connectionId,
                classroomLinkId,
                activityLinkId,
                request.microsoftSubmissionId()
        );
    }

    public record ImportSubmissionRequest(String microsoftSubmissionId) {}
}
