package br.com.arenadev.identity;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DisplayNameServiceTest {

    @Test
    void bulkResolutionLoadsClassroomEnrollmentsOnceAndPreservesPreferredNameFallbacks() {
        EnrollmentRepository repository = mock(EnrollmentRepository.class);
        DisplayNameService service = new DisplayNameService(repository);
        UUID classroomId = UUID.randomUUID();

        Student ana = student("Ana Maria", "Aninha");
        Student bruno = student("Bruno Lima", "B");
        Student clara = student("Clara Sousa", null);

        Enrollment anaEnrollment = enrollment(ana, "Ana M.");
        Enrollment brunoEnrollment = enrollment(bruno, null);
        when(repository.findByClassroomIdOrderByStudentNameAsc(classroomId))
                .thenReturn(List.of(anaEnrollment, brunoEnrollment));

        var names = service.resolveAll(
                classroomId,
                List.of(ana, bruno, clara),
                DisplayNamePolicy.PREFERRED_NAME
        );

        assertThat(names)
                .containsEntry(ana.getId(), "Ana M.")
                .containsEntry(bruno.getId(), "B")
                .containsEntry(clara.getId(), "Clara");
        verify(repository).findByClassroomIdOrderByStudentNameAsc(classroomId);
        verify(repository, never()).findByClassroomIdAndStudentId(any(UUID.class), any(UUID.class));
    }

    private static Student student(String name, String nickname) {
        Student student = mock(Student.class);
        UUID id = UUID.randomUUID();
        when(student.getId()).thenReturn(id);
        when(student.getName()).thenReturn(name);
        when(student.getNickname()).thenReturn(nickname);
        return student;
    }

    private static Enrollment enrollment(Student student, String preferredName) {
        Enrollment enrollment = mock(Enrollment.class);
        when(enrollment.getStudent()).thenReturn(student);
        when(enrollment.getPreferredName()).thenReturn(preferredName);
        return enrollment;
    }
}
