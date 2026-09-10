package br.com.arenadev.identity;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class DisplayNameService {
    private final EnrollmentRepository enrollmentRepository;

    public DisplayNameService(EnrollmentRepository enrollmentRepository) {
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    public String resolve(UUID classroomId, Student student, DisplayNamePolicy policy) {
        DisplayNamePolicy effectivePolicy = policy == null
                ? DisplayNamePolicy.FIRST_OR_PREFERRED
                : policy;
        String preferredName = preferredName(classroomId, student);

        return switch (effectivePolicy) {
            case FULL_NAME -> student.getName().trim();
            case FIRST_NAME -> firstName(student.getName());
            case PREFERRED_NAME -> preferredName == null ? firstName(student.getName()) : preferredName;
            case FIRST_OR_PREFERRED -> preferredName == null ? firstName(student.getName()) : preferredName;
            case ANONYMOUS -> "Participante";
        };
    }

    @Transactional(readOnly = true)
    public String preferredName(UUID classroomId, Student student) {
        return enrollmentRepository
                .findByClassroomIdAndStudentId(classroomId, student.getId())
                .map(Enrollment::getPreferredName)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> normalizeOptional(student.getNickname()));
    }

    private static String firstName(String fullName) {
        String normalized = fullName == null ? "" : fullName.trim();
        if (normalized.isBlank()) return "Participante";
        int separator = normalized.indexOf(' ');
        return separator < 0 ? normalized : normalized.substring(0, separator);
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
