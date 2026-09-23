package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftActivityMappingServiceTest {

    @Test
    void discoversRemoteAssignmentsLocalActivitiesAndExistingMappings() {
        var connections = mock(IntegrationConnectionService.class);
        var classroomLinks = mock(ExternalClassroomLinkRepository.class);
        var activityLinks = mock(ExternalActivityLinkRepository.class);
        var activities = mock(ActivityRepository.class);
        var tokens = mock(MicrosoftGraphTokenProvider.class);
        var graph = mock(MicrosoftGraphEducationClient.class);
        var externalLinks = mock(ExternalLinkService.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var activityId = UUID.randomUUID();

        var connection = new IntegrationConnectionEntity(
                connectionId,
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01",
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                IntegrationConnectionStatus.ACTIVE,
                Instant.parse("2026-09-19T18:00:00Z")
        );
        var classLink = new ExternalClassroomLinkEntity(
                classroomLinkId,
                connectionId,
                classroomId,
                "class-1",
                null,
                Instant.parse("2026-09-19T18:00:00Z")
        );

        var activity = mock(Activity.class);
        when(activity.getId()).thenReturn(activityId);
        when(activity.getTitle()).thenReturn("Projeto API");
        when(activity.getTopic()).thenReturn("Backend");
        when(activity.getUpdatedAt()).thenReturn(Instant.parse("2026-09-19T18:00:00Z"));

        when(connections.required(connectionId)).thenReturn(connection);
        when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(classLink));
        when(tokens.acquire("tenant-01")).thenReturn(
                new MicrosoftGraphAccessToken(
                        "token",
                        OffsetDateTime.parse("2026-09-19T20:00:00Z")
                )
        );
        when(graph.listClassAssignments("token", "class-1")).thenReturn(List.of(
                new MicrosoftEducationAssignment(
                        "assignment-1",
                        "class-1",
                        "Projeto API",
                        "assigned",
                        OffsetDateTime.parse("2026-09-19T17:00:00Z"),
                        OffsetDateTime.parse("2026-09-25T23:59:00Z"),
                        "https://teams.microsoft.com/assignment-1"
                )
        ));
        when(activities.findByClassroomIdOrderByUpdatedAtDesc(classroomId))
                .thenReturn(List.of(activity));
        when(activityLinks.findByConnectionIdAndExternalClassroomLinkId(
                connectionId,
                classroomLinkId
        )).thenReturn(List.of());

        var service = new MicrosoftActivityMappingService(
                connections,
                classroomLinks,
                activityLinks,
                activities,
                tokens,
                graph,
                externalLinks
        );

        var result = service.discover(connectionId, classroomLinkId);

        assertThat(result.assignments()).hasSize(1);
        assertThat(result.localActivities()).hasSize(1);
        assertThat(result.assignments().getFirst().displayName())
                .isEqualTo("Projeto API");
        assertThat(result.localActivities().getFirst().title())
                .isEqualTo("Projeto API");
    }
}
