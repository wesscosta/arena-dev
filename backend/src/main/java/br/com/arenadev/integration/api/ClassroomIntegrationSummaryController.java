package br.com.arenadev.integration.api;

import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations/classrooms")
public class ClassroomIntegrationSummaryController {
    private final ExternalClassroomLinkRepository classroomLinks;
    private final IntegrationConnectionRepository connections;
    private final ExternalStudentLinkRepository studentLinks;
    private final ExternalActivityLinkRepository activityLinks;

    public ClassroomIntegrationSummaryController(
            ExternalClassroomLinkRepository classroomLinks,
            IntegrationConnectionRepository connections,
            ExternalStudentLinkRepository studentLinks,
            ExternalActivityLinkRepository activityLinks
    ) {
        this.classroomLinks = classroomLinks;
        this.connections = connections;
        this.studentLinks = studentLinks;
        this.activityLinks = activityLinks;
    }

    @GetMapping("/{classroomId}/summary")
    public ClassroomIntegrationSummaryResponse summary(
            @PathVariable UUID classroomId
    ) {
        var integrations = classroomLinks.findByClassroomId(classroomId).stream()
                .map(link -> {
                    var connection = connections.findById(link.getConnectionId())
                            .orElse(null);

                    if (connection == null) {
                        return new IntegrationSummary(
                                link.getId(),
                                link.getConnectionId(),
                                null,
                                "Conexão indisponível",
                                null,
                                link.getExternalClassroomId(),
                                link.getExternalWebUrl(),
                                0,
                                0
                        );
                    }

                    int linkedStudents = studentLinks
                            .findByConnectionIdAndExternalClassroomLinkId(
                                    link.getConnectionId(),
                                    link.getId()
                            )
                            .size();

                    int mappedActivities = activityLinks
                            .findByConnectionIdAndExternalClassroomLinkId(
                                    link.getConnectionId(),
                                    link.getId()
                            )
                            .size();

                    return new IntegrationSummary(
                            link.getId(),
                            link.getConnectionId(),
                            connection.getProvider().name(),
                            connection.getDisplayName(),
                            connection.getStatus().name(),
                            link.getExternalClassroomId(),
                            link.getExternalWebUrl(),
                            linkedStudents,
                            mappedActivities
                    );
                })
                .toList();

        return new ClassroomIntegrationSummaryResponse(
                classroomId,
                integrations
        );
    }

    public record ClassroomIntegrationSummaryResponse(
            UUID classroomId,
            List<IntegrationSummary> integrations
    ) {
        public ClassroomIntegrationSummaryResponse {
            integrations = List.copyOf(integrations);
        }
    }

    public record IntegrationSummary(
            UUID classroomLinkId,
            UUID connectionId,
            String provider,
            String connectionName,
            String connectionStatus,
            String externalClassroomId,
            String externalWebUrl,
            int linkedStudents,
            int mappedActivities
    ) {}
}
