package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkEntity;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MicrosoftRosterDiscoveryServiceTest {

    @Test
    void discoversRosterForLinkedMicrosoftClass() {
        var connections = mock(IntegrationConnectionService.class);
        var classroomLinks = mock(ExternalClassroomLinkRepository.class);
        var tokens = mock(MicrosoftGraphTokenProvider.class);
        var graph = mock(MicrosoftGraphEducationClient.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        when(connections.required(connectionId)).thenReturn(
                new IntegrationConnectionEntity(
                        connectionId,
                        LearningPlatformProvider.MICROSOFT_TEAMS,
                        "Senac",
                        "tenant-01",
                        MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                        IntegrationConnectionStatus.ACTIVE,
                        Instant.parse("2026-09-19T16:00:00Z")
                )
        );

        when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(
                new ExternalClassroomLinkEntity(
                        classroomLinkId,
                        connectionId,
                        classroomId,
                        "class-1",
                        null,
                        Instant.parse("2026-09-19T16:00:00Z")
                )
        ));

        when(tokens.acquire("tenant-01")).thenReturn(
                new MicrosoftGraphAccessToken(
                        "token-123",
                        OffsetDateTime.parse("2026-09-19T19:00:00Z")
                )
        );

        when(graph.listClassMembers("token-123", "class-1")).thenReturn(List.of(
                new MicrosoftEducationUser(
                        "user-1",
                        "Maria Silva",
                        "Maria",
                        "Silva",
                        "maria@school.example",
                        "student",
                        "MAT-001"
                ),
                new MicrosoftEducationUser(
                        "user-2",
                        "Professor João",
                        "João",
                        null,
                        "joao@school.example",
                        "teacher",
                        "DOC-001"
                )
        ));

        var service = new MicrosoftRosterDiscoveryService(
                connections,
                classroomLinks,
                tokens,
                graph
        );

        var result = service.discover(connectionId, classroomLinkId);

        assertThat(result.microsoftClassId()).isEqualTo("class-1");
        assertThat(result.members()).hasSize(2);
        assertThat(result.studentCount()).isEqualTo(1);
        assertThat(result.teacherCount()).isEqualTo(1);
        assertThat(result.members().getFirst().externalId()).isEqualTo("MAT-001");

        verify(graph).listClassMembers("token-123", "class-1");
    }

    @Test
    void rejectsClassroomLinkFromAnotherConnection() {
        var connections = mock(IntegrationConnectionService.class);
        var classroomLinks = mock(ExternalClassroomLinkRepository.class);
        var tokens = mock(MicrosoftGraphTokenProvider.class);
        var graph = mock(MicrosoftGraphEducationClient.class);

        var connectionId = UUID.randomUUID();
        var otherConnectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();

        when(connections.required(connectionId)).thenReturn(
                new IntegrationConnectionEntity(
                        connectionId,
                        LearningPlatformProvider.MICROSOFT_TEAMS,
                        "Senac",
                        "tenant-01",
                        MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                        IntegrationConnectionStatus.ACTIVE,
                        Instant.parse("2026-09-19T16:00:00Z")
                )
        );

        when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(
                new ExternalClassroomLinkEntity(
                        classroomLinkId,
                        otherConnectionId,
                        UUID.randomUUID(),
                        "class-1",
                        null,
                        Instant.parse("2026-09-19T16:00:00Z")
                )
        ));

        var service = new MicrosoftRosterDiscoveryService(
                connections,
                classroomLinks,
                tokens,
                graph
        );

        assertThatThrownBy(() -> service.discover(connectionId, classroomLinkId))
                .isInstanceOf(IntegrationNotFoundException.class);

        verifyNoInteractions(tokens, graph);
    }
}
