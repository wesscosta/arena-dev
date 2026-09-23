package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftEducationUser;
import br.com.arenadev.integration.provider.microsoft.MicrosoftRosterDiscoveryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/microsoft")
public class MicrosoftRosterController {
    private final MicrosoftRosterDiscoveryService service;

    public MicrosoftRosterController(MicrosoftRosterDiscoveryService service) {
        this.service = service;
    }

    @GetMapping("/connections/{connectionId}/class-links/{classroomLinkId}/roster")
    public MicrosoftRosterResponse roster(
            @PathVariable UUID connectionId,
            @PathVariable UUID classroomLinkId
    ) {
        var result = service.discover(connectionId, classroomLinkId);

        return new MicrosoftRosterResponse(
                result.connectionId(),
                result.classroomLinkId(),
                result.classroomId(),
                result.microsoftClassId(),
                result.members().size(),
                result.studentCount(),
                result.teacherCount(),
                result.members()
        );
    }

    public record MicrosoftRosterResponse(
            UUID connectionId,
            UUID classroomLinkId,
            UUID classroomId,
            String microsoftClassId,
            int memberCount,
            long studentCount,
            long teacherCount,
            List<MicrosoftEducationUser> members
    ) {}
}
