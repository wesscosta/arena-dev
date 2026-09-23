package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftStudentMatchApplyAction;
import br.com.arenadev.integration.provider.microsoft.MicrosoftStudentMatchingApplyService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftStudentMatchingApplyController {
    private final MicrosoftStudentMatchingApplyService service;

    public MicrosoftStudentMatchingApplyController(
            MicrosoftStudentMatchingApplyService service
    ) {
        this.service = service;
    }

    @PostMapping(
            "/connections/{connectionId}/class-links/{classroomLinkId}/student-match-apply"
    )
    public ApplyStudentMatchResponse apply(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId,
            @RequestBody ApplyStudentMatchRequest request
    ) {
        var result = service.apply(
                connectionId,
                classroomLinkId,
                request.microsoftUserId(),
                request.action(),
                request.localStudentId()
        );

        return new ApplyStudentMatchResponse(
                result.microsoftUserId(),
                result.studentId(),
                result.enrollmentId(),
                result.externalStudentLinkId(),
                result.studentName(),
                result.action(),
                result.changed()
        );
    }

    public record ApplyStudentMatchRequest(
            String microsoftUserId,
            MicrosoftStudentMatchApplyAction action,
            UUID localStudentId
    ) {}

    public record ApplyStudentMatchResponse(
            String microsoftUserId,
            UUID studentId,
            UUID enrollmentId,
            UUID externalStudentLinkId,
            String studentName,
            MicrosoftStudentMatchApplyAction action,
            boolean changed
    ) {}
}
