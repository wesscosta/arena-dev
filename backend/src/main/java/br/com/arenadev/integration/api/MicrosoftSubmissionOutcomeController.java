package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomePreviewService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftSubmissionOutcomeController {
    private final MicrosoftSubmissionOutcomePreviewService service;

    public MicrosoftSubmissionOutcomeController(
            MicrosoftSubmissionOutcomePreviewService service
    ) {
        this.service = service;
    }

    @GetMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-links/{activityLinkId}/submissions/{microsoftSubmissionId}/outcomes"
    )
    public MicrosoftSubmissionOutcomePreviewService.OutcomePreview preview(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @PathVariable UUID activityLinkId,
            @PathVariable String microsoftSubmissionId
    ) {
        return service.preview(
                connectionId,
                classroomLinkId,
                activityLinkId,
                microsoftSubmissionId
        );
    }
}
