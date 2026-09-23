package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftRosterReconciliationAction;
import br.com.arenadev.integration.provider.microsoft.MicrosoftRosterReconciliationService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftRosterReconciliationController {
    private final MicrosoftRosterReconciliationService service;

    public MicrosoftRosterReconciliationController(
            MicrosoftRosterReconciliationService service
    ) {
        this.service = service;
    }

    @GetMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/reconciliation"
    )
    public MicrosoftRosterReconciliationService.ReconciliationResult analyze(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId
    ) {
        return service.analyze(connectionId, classroomLinkId);
    }

    @PostMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/reconciliation/{externalStudentLinkId}"
    )
    public MicrosoftRosterReconciliationService.ReconciliationApplyResult apply(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @PathVariable UUID externalStudentLinkId,
            @RequestBody ReconciliationActionRequest request
    ) {
        return service.apply(
                connectionId,
                classroomLinkId,
                externalStudentLinkId,
                request.action()
        );
    }

    public record ReconciliationActionRequest(
            MicrosoftRosterReconciliationAction action
    ) {}
}
