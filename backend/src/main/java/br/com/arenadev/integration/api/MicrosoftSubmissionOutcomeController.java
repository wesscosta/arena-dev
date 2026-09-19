package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomePreviewService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftSubmissionOutcomeController {
    private final MicrosoftSubmissionOutcomePreviewService service;
    private final br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomeApplyService applyService;

    public MicrosoftSubmissionOutcomeController(
            MicrosoftSubmissionOutcomePreviewService service,
            br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomeApplyService applyService
    ) {
        this.service = service;
        this.applyService = applyService;
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

    @PostMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/activity-links/{activityLinkId}/submissions/{microsoftSubmissionId}/outcomes/apply"
    )
    public br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomeApplyService.ApplyResult apply(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @PathVariable UUID activityLinkId,
            @PathVariable String microsoftSubmissionId,
            @RequestBody ApplyOutcomeRequest request
    ) {
        return applyService.apply(
                connectionId,
                classroomLinkId,
                activityLinkId,
                microsoftSubmissionId,
                request.action()
        );
    }

    public record ApplyOutcomeRequest(
            br.com.arenadev.integration.provider.microsoft.MicrosoftSubmissionOutcomeApplyService.ApplyAction action
    ) {}
}
