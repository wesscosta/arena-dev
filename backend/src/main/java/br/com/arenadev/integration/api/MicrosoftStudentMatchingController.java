package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftStudentMatchingPreviewService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftStudentMatchingController {
    private final MicrosoftStudentMatchingPreviewService service;

    public MicrosoftStudentMatchingController(
            MicrosoftStudentMatchingPreviewService service
    ) {
        this.service = service;
    }

    @GetMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/student-match-preview"
    )
    public MicrosoftStudentMatchingPreviewService.PreviewResult preview(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId
    ) {
        return service.preview(connectionId, classroomLinkId);
    }
}
