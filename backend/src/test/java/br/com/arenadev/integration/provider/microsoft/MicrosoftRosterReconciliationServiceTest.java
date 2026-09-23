package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.integration.persistence.ExternalStudentLinkEntity;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftRosterReconciliationServiceTest {

    @Test
    void detectsRemoteMissingAndLocalInactiveWithoutChangingEnrollments() {
        var roster = mock(MicrosoftRosterDiscoveryService.class);
        var links = mock(ExternalStudentLinkRepository.class);
        var enrollments = mock(EnrollmentRepository.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        var missingEnrollment = mock(Enrollment.class);
        var inactiveEnrollment = mock(Enrollment.class);
        var missingStudent = mock(Student.class);
        var inactiveStudent = mock(Student.class);

        var missingEnrollmentId = UUID.randomUUID();
        var inactiveEnrollmentId = UUID.randomUUID();

        when(missingEnrollment.getId()).thenReturn(missingEnrollmentId);
        when(missingEnrollment.getStudent()).thenReturn(missingStudent);
        when(missingEnrollment.isActive()).thenReturn(true);
        when(missingStudent.getId()).thenReturn(UUID.randomUUID());
        when(missingStudent.getName()).thenReturn("Aluno Ausente");

        when(inactiveEnrollment.getId()).thenReturn(inactiveEnrollmentId);
        when(inactiveEnrollment.getStudent()).thenReturn(inactiveStudent);
        when(inactiveEnrollment.isActive()).thenReturn(false);
        when(inactiveStudent.getId()).thenReturn(UUID.randomUUID());
        when(inactiveStudent.getName()).thenReturn("Aluno Inativo");

        when(roster.discover(connectionId, classroomLinkId)).thenReturn(
                new MicrosoftRosterDiscoveryService.RosterResult(
                        connectionId,
                        classroomLinkId,
                        classroomId,
                        "class-1",
                        List.of(new MicrosoftEducationUser(
                                "ms-inactive",
                                "Aluno Inativo",
                                null,
                                null,
                                "inativo@example.edu",
                                "student",
                                null
                        )),
                        1,
                        0
                )
        );

        var missingLink = new ExternalStudentLinkEntity(
                UUID.randomUUID(),
                connectionId,
                classroomLinkId,
                missingEnrollmentId,
                "ms-missing",
                Instant.parse("2026-09-19T18:00:00Z")
        );
        var inactiveLink = new ExternalStudentLinkEntity(
                UUID.randomUUID(),
                connectionId,
                classroomLinkId,
                inactiveEnrollmentId,
                "ms-inactive",
                Instant.parse("2026-09-19T18:00:00Z")
        );

        when(links.findByConnectionIdAndExternalClassroomLinkId(connectionId, classroomLinkId))
                .thenReturn(List.of(missingLink, inactiveLink));
        when(enrollments.findById(missingEnrollmentId))
                .thenReturn(Optional.of(missingEnrollment));
        when(enrollments.findById(inactiveEnrollmentId))
                .thenReturn(Optional.of(inactiveEnrollment));

        var service = new MicrosoftRosterReconciliationService(
                roster,
                links,
                enrollments
        );

        var result = service.analyze(connectionId, classroomLinkId);

        assertThat(result.remoteMissing()).isEqualTo(1);
        assertThat(result.localInactive()).isEqualTo(1);
        assertThat(result.inSync()).isZero();

        verify(missingEnrollment, never()).setActive(anyBoolean());
        verify(inactiveEnrollment, never()).setActive(anyBoolean());
    }
}
