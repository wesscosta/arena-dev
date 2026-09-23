package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MicrosoftClassLinkServiceTest {

    @Test
    void linksOnlyAClassThatWasDiscoveredForTheConnection() {
        var classrooms = mock(ClassroomRepository.class);
        var discovery = mock(MicrosoftClassDiscoveryService.class);
        var links = mock(ExternalLinkService.class);

        var connectionId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var linkId = UUID.randomUUID();

        when(classrooms.existsById(classroomId)).thenReturn(true);
        when(discovery.discover(connectionId)).thenReturn(
                new MicrosoftClassDiscoveryService.DiscoveryResult(
                        connectionId,
                        "tenant-01",
                        List.of(new MicrosoftEducationClass(
                                "class-1",
                                "TDS 2026",
                                "TDS-2026",
                                null,
                                null,
                                null,
                                null
                        ))
                )
        );

        when(links.linkClassroom(
                connectionId,
                classroomId,
                "class-1",
                null
        )).thenReturn(new ExternalClassroomLinkEntity(
                linkId,
                connectionId,
                classroomId,
                "class-1",
                null,
                Instant.parse("2026-09-19T16:00:00Z")
        ));

        var service = new MicrosoftClassLinkService(
                classrooms,
                discovery,
                links
        );

        var result = service.link(connectionId, classroomId, "class-1");

        assertThat(result.linkId()).isEqualTo(linkId);
        assertThat(result.microsoftDisplayName()).isEqualTo("TDS 2026");
        verify(links).linkClassroom(connectionId, classroomId, "class-1", null);
    }

    @Test
    void rejectsRemoteClassOutsideCurrentDiscovery() {
        var classrooms = mock(ClassroomRepository.class);
        var discovery = mock(MicrosoftClassDiscoveryService.class);
        var links = mock(ExternalLinkService.class);

        var connectionId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        when(classrooms.existsById(classroomId)).thenReturn(true);
        when(discovery.discover(connectionId)).thenReturn(
                new MicrosoftClassDiscoveryService.DiscoveryResult(
                        connectionId,
                        "tenant-01",
                        List.of()
                )
        );

        var service = new MicrosoftClassLinkService(
                classrooms,
                discovery,
                links
        );

        assertThatThrownBy(() -> service.link(connectionId, classroomId, "missing"))
                .isInstanceOf(IntegrationNotFoundException.class)
                .hasMessageContaining("missing");

        verifyNoInteractions(links);
    }
}
