package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.*;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.persistence.ExternalStudentLinkEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftStudentMatchingApplyServiceTest {

    @Test
    void appliesSuggestedSafeMatchAndCreatesEnrollmentWhenMissing() {
        var preview = mock(MicrosoftStudentMatchingPreviewService.class);
        var classrooms = mock(ClassroomRepository.class);
        var students = mock(StudentRepository.class);
        var enrollments = mock(EnrollmentRepository.class);
        var externalLinks = mock(ExternalLinkService.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var studentId = UUID.randomUUID();
        var enrollmentId = UUID.randomUUID();
        var externalLinkId = UUID.randomUUID();

        var student = mock(Student.class);
        var classroom = mock(Classroom.class);
        var enrollment = mock(Enrollment.class);

        when(student.getId()).thenReturn(studentId);
        when(student.getName()).thenReturn("Maria Silva");
        when(enrollment.getId()).thenReturn(enrollmentId);

        when(preview.preview(connectionId, classroomLinkId)).thenReturn(
                new MicrosoftStudentMatchingPreviewService.PreviewResult(
                        connectionId,
                        classroomLinkId,
                        classroomId,
                        "class-1",
                        List.of(new MicrosoftStudentMatchingPreviewService.PreviewItem(
                                "ms-1",
                                "Maria Silva",
                                "maria@example.edu",
                                "MAT-001",
                                MicrosoftStudentMatchStatus.SAFE_MATCH,
                                studentId,
                                null,
                                "Maria Silva",
                                "Matrícula institucional coincide."
                        )),
                        0, 1, 0, 0, 0, 0, 0
                )
        );

        when(classrooms.findById(classroomId)).thenReturn(Optional.of(classroom));
        when(students.findById(studentId)).thenReturn(Optional.of(student));
        when(enrollments.findByClassroomIdAndStudentId(classroomId, studentId))
                .thenReturn(Optional.empty());
        when(enrollments.save(any(Enrollment.class))).thenReturn(enrollment);

        when(externalLinks.linkStudent(
                connectionId,
                classroomLinkId,
                enrollmentId,
                "ms-1"
        )).thenReturn(new ExternalStudentLinkEntity(
                externalLinkId,
                connectionId,
                classroomLinkId,
                enrollmentId,
                "ms-1",
                Instant.parse("2026-09-19T18:00:00Z")
        ));

        var service = new MicrosoftStudentMatchingApplyService(
                preview, classrooms, students, enrollments, externalLinks
        );

        var result = service.apply(
                connectionId,
                classroomLinkId,
                "ms-1",
                MicrosoftStudentMatchApplyAction.APPLY_SUGGESTED,
                null
        );

        assertThat(result.studentId()).isEqualTo(studentId);
        assertThat(result.enrollmentId()).isEqualTo(enrollmentId);
        assertThat(result.externalStudentLinkId()).isEqualTo(externalLinkId);
        verify(enrollments).save(any(Enrollment.class));
        verify(enrollment).setActive(true);
    }

    @Test
    void createsStudentForCurrentNewStudentPreview() {
        var preview = mock(MicrosoftStudentMatchingPreviewService.class);
        var classrooms = mock(ClassroomRepository.class);
        var students = mock(StudentRepository.class);
        var enrollments = mock(EnrollmentRepository.class);
        var externalLinks = mock(ExternalLinkService.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var studentId = UUID.randomUUID();
        var enrollmentId = UUID.randomUUID();

        var classroom = mock(Classroom.class);
        var savedStudent = mock(Student.class);
        var savedEnrollment = mock(Enrollment.class);

        when(savedStudent.getId()).thenReturn(studentId);
        when(savedStudent.getName()).thenReturn("Aluno Novo");
        when(savedEnrollment.getId()).thenReturn(enrollmentId);

        when(preview.preview(connectionId, classroomLinkId)).thenReturn(
                new MicrosoftStudentMatchingPreviewService.PreviewResult(
                        connectionId,
                        classroomLinkId,
                        classroomId,
                        "class-1",
                        List.of(new MicrosoftStudentMatchingPreviewService.PreviewItem(
                                "ms-new",
                                "Aluno Novo",
                                "novo@example.edu",
                                "MAT-999",
                                MicrosoftStudentMatchStatus.NEW_STUDENT,
                                null,
                                null,
                                null,
                                "Nenhum aluno local identificado."
                        )),
                        0, 0, 1, 0, 0, 0, 0
                )
        );

        when(classrooms.findById(classroomId)).thenReturn(Optional.of(classroom));
        when(students.findByRegistrationIgnoreCase("MAT-999")).thenReturn(Optional.empty());
        when(students.save(any(Student.class))).thenReturn(savedStudent);
        when(enrollments.findByClassroomIdAndStudentId(classroomId, studentId))
                .thenReturn(Optional.empty());
        when(enrollments.save(any(Enrollment.class))).thenReturn(savedEnrollment);
        when(externalLinks.linkStudent(
                connectionId, classroomLinkId, enrollmentId, "ms-new"
        )).thenReturn(new ExternalStudentLinkEntity(
                UUID.randomUUID(),
                connectionId,
                classroomLinkId,
                enrollmentId,
                "ms-new",
                Instant.parse("2026-09-19T18:00:00Z")
        ));

        var service = new MicrosoftStudentMatchingApplyService(
                preview, classrooms, students, enrollments, externalLinks
        );

        var result = service.apply(
                connectionId,
                classroomLinkId,
                "ms-new",
                MicrosoftStudentMatchApplyAction.CREATE_NEW_STUDENT,
                null
        );

        assertThat(result.studentId()).isEqualTo(studentId);
        verify(students).save(any(Student.class));
        verify(enrollments).save(any(Enrollment.class));
    }
}
