package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftEducationUser;
import br.com.arenadev.integration.provider.microsoft.MicrosoftRosterDiscoveryService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftRosterControllerTest {

    @Test
    void returnsNormalizedRosterWithCounts() {
        var service = mock(MicrosoftRosterDiscoveryService.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        when(service.discover(connectionId, classroomLinkId)).thenReturn(
                new MicrosoftRosterDiscoveryService.RosterResult(
                        connectionId,
                        classroomLinkId,
                        classroomId,
                        "class-1",
                        List.of(
                                new MicrosoftEducationUser(
                                        "user-1",
                                        "Maria Silva",
                                        "Maria",
                                        "Silva",
                                        "maria@school.example",
                                        "student",
                                        "MAT-001"
                                )
                        ),
                        1,
                        0
                )
        );

        var controller = new MicrosoftRosterController(service);
        var response = controller.roster(connectionId, classroomLinkId);

        assertThat(response.memberCount()).isEqualTo(1);
        assertThat(response.studentCount()).isEqualTo(1);
        assertThat(response.teacherCount()).isZero();
        assertThat(response.members().getFirst().isStudent()).isTrue();
    }
}
