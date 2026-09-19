package br.com.arenadev.integration.api;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkEntity;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationClassroomLinksQueryController {
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;

    public IntegrationClassroomLinksQueryController(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
    }

    @GetMapping("/connections/{connectionId}/classroom-links")
    public List<ClassroomLinkResponse> list(@PathVariable UUID connectionId) {
        connections.required(connectionId);
        return classroomLinks.findByConnectionId(connectionId).stream()
                .sorted(Comparator.comparing(link -> link.getClassroomId().toString()))
                .map(ClassroomLinkResponse::from)
                .toList();
    }

    public record ClassroomLinkResponse(
            UUID id,
            UUID connectionId,
            UUID classroomId,
            String externalClassroomId,
            String externalWebUrl
    ) {
        static ClassroomLinkResponse from(ExternalClassroomLinkEntity entity) {
            return new ClassroomLinkResponse(
                    entity.getId(),
                    entity.getConnectionId(),
                    entity.getClassroomId(),
                    entity.getExternalClassroomId(),
                    entity.getExternalWebUrl()
            );
        }
    }
}
