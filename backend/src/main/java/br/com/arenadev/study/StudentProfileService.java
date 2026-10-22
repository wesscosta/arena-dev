package br.com.arenadev.study;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The student's own registration, reached through the remembered device of
 * one classroom. No e-mail verification in this version: whoever holds the
 * device claim may complete the name (while pending) and declare an e-mail
 * (unless the teacher set one).
 */
@Service
public class StudentProfileService {
    private final EnrollmentRepository enrollments;
    private final StudentService students;

    public StudentProfileService(EnrollmentRepository enrollments, StudentService students) {
        this.enrollments = enrollments;
        this.students = students;
    }

    @Transactional(readOnly = true)
    public ProfileView get(StudyPrincipal principal) {
        return ProfileView.from(enrollment(principal));
    }

    @Transactional
    public ProfileView complete(StudyPrincipal principal, String name, String email) {
        Enrollment enrollment = enrollment(principal);
        students.completeByStudent(enrollment.getStudent().getId(), name, email);
        return ProfileView.from(enrollment);
    }

    private Enrollment enrollment(StudyPrincipal principal) {
        return enrollments.findById(principal.enrollmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada."));
    }

    public record ProfileView(
            UUID studentId,
            String name,
            boolean namePending,
            String registration,
            String email,
            boolean emailSetByTeacher,
            String classroomName,
            String preferredName,
            boolean complete
    ) {
        static ProfileView from(Enrollment enrollment) {
            Student student = enrollment.getStudent();
            return new ProfileView(
                    student.getId(),
                    student.getName(),
                    student.isNamePending(),
                    student.getRegistration(),
                    student.getEmail(),
                    student.getEmailSource() == Student.EmailSource.TEACHER,
                    enrollment.getClassroom().getName(),
                    enrollment.getPreferredName(),
                    !student.isNamePending()
            );
        }
    }
}
