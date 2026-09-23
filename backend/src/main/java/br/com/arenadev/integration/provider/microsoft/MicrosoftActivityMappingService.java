package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.application.SyncTelemetryRunner;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.persistence.ExternalActivityLinkEntity;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MicrosoftActivityMappingService {
    private SyncTelemetryRunner telemetry;
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;
    private final ExternalActivityLinkRepository activityLinks;
    private final ActivityRepository activities;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient graph;
    private final ExternalLinkService externalLinks;

    public MicrosoftActivityMappingService(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks,
            ExternalActivityLinkRepository activityLinks,
            ActivityRepository activities,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient graph,
            ExternalLinkService externalLinks
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
        this.activityLinks = activityLinks;
        this.activities = activities;
        this.tokenProvider = tokenProvider;
        this.graph = graph;
        this.externalLinks = externalLinks;
    }

    @Autowired(required = false)
    void setTelemetry(SyncTelemetryRunner telemetry) {
        this.telemetry = telemetry;
    }

    @Transactional(readOnly = true)
    public DiscoveryResult discover(UUID connectionId, UUID classroomLinkId) {
        if (telemetry != null) {
            return telemetry.run(
                    connectionId,
                    "ACTIVITIES",
                    SyncDirection.IMPORT,
                    "CLASSROOM",
                    classroomLinkId.toString(),
                    () -> discoverWithoutTelemetry(connectionId, classroomLinkId)
            );
        }
        return discoverWithoutTelemetry(connectionId, classroomLinkId);
    }

    private DiscoveryResult discoverWithoutTelemetry(UUID connectionId, UUID classroomLinkId) {
        var context = context(connectionId, classroomLinkId);
        var token = tokenProvider.acquire(context.tenantId());
        var remote = graph.listClassAssignments(
                token.token(),
                context.externalClassroomId()
        );

        var local = activities
                .findByClassroomIdOrderByUpdatedAtDesc(context.classroomId())
                .stream()
                .map(activity -> new LocalActivity(
                        activity.getId(),
                        activity.getTitle(),
                        activity.getTopic(),
                        activity.getUpdatedAt()
                ))
                .toList();

        var mappings = activityLinks
                .findByConnectionIdAndExternalClassroomLinkId(
                        connectionId,
                        classroomLinkId
                )
                .stream()
                .map(Mapping::from)
                .toList();

        return new DiscoveryResult(
                connectionId,
                classroomLinkId,
                context.classroomId(),
                context.externalClassroomId(),
                remote,
                local,
                mappings
        );
    }

    @Transactional
    public Mapping link(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityId,
            String microsoftAssignmentId
    ) {
        var context = context(connectionId, classroomLinkId);

        var activity = activities.findById(activityId)
                .filter(candidate -> candidate.getClassroom().getId().equals(context.classroomId()))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Atividade local não pertence à turma vinculada: " + activityId
                ));

        String assignmentId = required(
                microsoftAssignmentId,
                "microsoftAssignmentId"
        );

        var token = tokenProvider.acquire(context.tenantId());
        var assignment = graph
                .listClassAssignments(token.token(), context.externalClassroomId())
                .stream()
                .filter(candidate -> candidate.id().equals(assignmentId))
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Assignment Microsoft não encontrada na turma vinculada: "
                                + assignmentId
                ));

        var link = externalLinks.linkActivity(
                connectionId,
                classroomLinkId,
                activity.getId(),
                assignment.id(),
                assignment.webUrl()
        );

        return Mapping.from(link);
    }

    private Context context(UUID connectionId, UUID classroomLinkId) {
        var connection = connections.required(connectionId);

        if (connection.getProvider() != LearningPlatformProvider.MICROSOFT_TEAMS) {
            throw new IllegalArgumentException(
                    "A conexão informada não pertence ao provider MICROSOFT_TEAMS."
            );
        }
        if (connection.getStatus() != IntegrationConnectionStatus.ACTIVE) {
            throw new IllegalStateException(
                    "A conexão Microsoft precisa estar ACTIVE."
            );
        }

        var classLink = classroomLinks.findById(classroomLinkId)
                .filter(link -> link.getConnectionId().equals(connectionId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de turma Microsoft não encontrado nesta conexão."
                ));

        String tenantId = required(
                connection.getExternalTenantId(),
                "tenantId da conexão Microsoft"
        );

        return new Context(
                tenantId,
                classLink.getClassroomId(),
                classLink.getExternalClassroomId()
        );
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " é obrigatório.");
        }
        return value.trim();
    }

    private record Context(
            String tenantId,
            UUID classroomId,
            String externalClassroomId
    ) {}

    public record LocalActivity(
            UUID id,
            String title,
            String topic,
            Instant updatedAt
    ) {}

    public record Mapping(
            UUID id,
            UUID activityId,
            String microsoftAssignmentId,
            String externalWebUrl
    ) {
        static Mapping from(ExternalActivityLinkEntity entity) {
            return new Mapping(
                    entity.getId(),
                    entity.getActivityId(),
                    entity.getExternalActivityId(),
                    entity.getExternalWebUrl()
            );
        }
    }

    public record DiscoveryResult(
            UUID connectionId,
            UUID classroomLinkId,
            UUID classroomId,
            String microsoftClassId,
            List<MicrosoftEducationAssignment> assignments,
            List<LocalActivity> localActivities,
            List<Mapping> mappings
    ) {
        public DiscoveryResult {
            assignments = List.copyOf(assignments);
            localActivities = List.copyOf(localActivities);
            mappings = List.copyOf(mappings);
        }
    }
}
