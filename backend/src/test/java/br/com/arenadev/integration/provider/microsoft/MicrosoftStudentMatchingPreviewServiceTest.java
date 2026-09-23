package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.*;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftStudentMatchingPreviewServiceTest {

    @Test
    void classifiesSafeNewReviewAndIgnoredMembersWithoutWritingAnything() {
        var roster = mock(MicrosoftRosterDiscoveryService.class);
        var students = mock(StudentRepository.class);
        var enrollments = mock(EnrollmentRepository.class);
        var externalLinks = mock(ExternalStudentLinkRepository.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        var existingStudent = new Student("MAT-001", "Maria Silva", null);
        var sameNameCandidate = new Student(null, "Pedro Santos", null);

        when(roster.discover(connectionId, classroomLinkId)).thenReturn(
                new MicrosoftRosterDiscoveryService.RosterResult(
                        connectionId,
                        classroomLinkId,
                        classroomId,
                        "class-1",
                        List.of(
                                new MicrosoftEducationUser(
                                        "ms-1", "Maria Silva", "Maria", "Silva",
                                        "maria@school.example", "student", "MAT-001"
                                ),
                                new MicrosoftEducationUser(
                                        "ms-2", "Ana Nova", "Ana", "Nova",
                                        "ana@school.example", "student", "MAT-999"
                                ),
                                new MicrosoftEducationUser(
                                        "ms-3", "Pedro Santos", "Pedro", "Santos",
                                        "pedro@school.example", "student", null
                                ),
                                new MicrosoftEducationUser(
                                        "ms-4", "Professor João", "João", null,
                                        "joao@school.example", "teacher", "DOC-001"
                                )
                        ),
                        3,
                        1
                )
        );

        when(students.findAllByOrderByNameAsc())
                .thenReturn(List.of(existingStudent, sameNameCandidate));
        when(enrollments.findByClassroomIdOrderByStudentNameAsc(classroomId))
                .thenReturn(List.of());

        when(externalLinks.findByConnectionIdAndExternalClassroomLinkIdAndExternalUserId(
                eq(connectionId), eq(classroomLinkId), anyString()
        )).thenReturn(Optional.empty());

        var service = new MicrosoftStudentMatchingPreviewService(
                roster,
                students,
                enrollments,
                externalLinks
        );

        var result = service.preview(connectionId, classroomLinkId);

        assertThat(result.safeMatches()).isEqualTo(1);
        assertThat(result.newStudents()).isEqualTo(1);
        assertThat(result.reviewRequired()).isEqualTo(1);
        assertThat(result.ignored()).isEqualTo(1);
        assertThat(result.conflicts()).isZero();

        assertThat(result.items())
                .extracting(MicrosoftStudentMatchingPreviewService.PreviewItem::status)
                .containsExactly(
                        MicrosoftStudentMatchStatus.SAFE_MATCH,
                        MicrosoftStudentMatchStatus.NEW_STUDENT,
                        MicrosoftStudentMatchStatus.REVIEW_REQUIRED,
                        MicrosoftStudentMatchStatus.IGNORED_NON_STUDENT
                );

        verify(externalLinks, never()).save(any());
        verify(students, never()).save(any());
        verify(enrollments, never()).save(any());
    }
}
