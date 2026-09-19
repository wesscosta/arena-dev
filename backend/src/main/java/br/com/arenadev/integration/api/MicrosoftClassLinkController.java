package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftClassLinkService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftClassLinkController {
    private final MicrosoftClassLinkService service;

    public MicrosoftClassLinkController(MicrosoftClassLinkService service) {
        this.service = service;
    }

    @PostMapping("/connections/{connectionId}/class-links")
    @ResponseStatus(HttpStatus.CREATED)
    public MicrosoftClassLinkResponse link(
            @PathVariable UUID connectionId,
            @RequestBody LinkMicrosoftClassRequest request
    ) {
        var result = service.link(
                connectionId,
                request.classroomId(),
                request.microsoftClassId()
        );

        return new MicrosoftClassLinkResponse(
                result.linkId(),
                result.connectionId(),
                result.classroomId(),
                result.microsoftClassId(),
                result.microsoftDisplayName(),
                result.microsoftClassCode()
        );
    }

    public record LinkMicrosoftClassRequest(
            UUID classroomId,
            String microsoftClassId
    ) {}

    public record MicrosoftClassLinkResponse(
            UUID linkId,
            UUID connectionId,
            UUID classroomId,
            String microsoftClassId,
            String microsoftDisplayName,
            String microsoftClassCode
    ) {}
}
