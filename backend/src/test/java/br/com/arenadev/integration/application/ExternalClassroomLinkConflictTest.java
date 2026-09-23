package br.com.arenadev.integration.application;

import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ExternalClassroomLinkConflictTest {

    @Test
    void repeatedIdenticalClassroomLinkIsIdempotent() {
        var connections = mock(IntegrationConnectionRepository.class);
        var classrooms = mock(ExternalClassroomLinkRepository.class);
        var students = mock(ExternalStudentLinkRepository.class);
        var activities = mock(ExternalActivityLinkRepository.class);
        var submissions = mock(ExternalSubmissionLinkRepository.class);

        var connectionId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var existing = new ExternalClassroomLinkEntity(
                UUID.randomUUID(),
                connectionId,
                classroomId,
                "class-1",
                null,
                Instant.parse("2026-09-19T16:00:00Z")
        );

        when(connections.existsById(connectionId)).thenReturn(true);
        when(classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId))
                .thenReturn(Optional.of(existing));

        var service = new ExternalLinkService(
                connections,
                classrooms,
                students,
                activities,
                submissions,
                Clock.fixed(Instant.parse("2026-09-19T16:00:00Z"), ZoneOffset.UTC)
        );

        assertThat(service.linkClassroom(connectionId, classroomId, "class-1", null))
                .isSameAs(existing);
        verify(classrooms, never()).save(any());
    }

    @Test
    void rejectsChangingExternalClassForSameLocalClassroom() {
        var connections = mock(IntegrationConnectionRepository.class);
        var classrooms = mock(ExternalClassroomLinkRepository.class);
        var students = mock(ExternalStudentLinkRepository.class);
        var activities = mock(ExternalActivityLinkRepository.class);
        var submissions = mock(ExternalSubmissionLinkRepository.class);

        var connectionId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var existing = new ExternalClassroomLinkEntity(
                UUID.randomUUID(),
                connectionId,
                classroomId,
                "class-1",
                null,
                Instant.parse("2026-09-19T16:00:00Z")
        );

        when(connections.existsById(connectionId)).thenReturn(true);
        when(classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId))
                .thenReturn(Optional.of(existing));

        var service = new ExternalLinkService(
                connections,
                classrooms,
                students,
                activities,
                submissions,
                Clock.systemUTC()
        );

        assertThatThrownBy(() ->
                service.linkClassroom(connectionId, classroomId, "class-2", null)
        ).isInstanceOf(IntegrationConflictException.class);

        verify(classrooms, never()).save(any());
    }
}
