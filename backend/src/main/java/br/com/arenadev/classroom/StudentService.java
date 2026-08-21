package br.com.arenadev.classroom;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StudentService {
    private final StudentRepository repository;

    public StudentService(StudentRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StudentView> list(boolean includeInactive) {
        List<Student> students = includeInactive
                ? repository.findAllByOrderByNameAsc()
                : repository.findByActiveTrueOrderByNameAsc();
        return students.stream().map(StudentView::from).toList();
    }

    @Transactional
    public StudentView create(String registration, String name, String nickname) {
        String normalizedRegistration = normalizeOptional(registration);
        validateRegistrationAvailable(normalizedRegistration, null);
        Student student = repository.save(new Student(
                normalizedRegistration,
                name.trim(),
                normalizeOptional(nickname)
        ));
        return StudentView.from(student);
    }

    @Transactional
    public StudentView update(UUID id, String registration, String name, String nickname, boolean active) {
        Student student = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado."));
        String normalizedRegistration = normalizeOptional(registration);
        validateRegistrationAvailable(normalizedRegistration, id);
        student.update(normalizedRegistration, name.trim(), normalizeOptional(nickname), active);
        return StudentView.from(student);
    }

    private void validateRegistrationAvailable(String registration, UUID currentId) {
        if (registration == null) {
            return;
        }
        boolean exists = currentId == null
                ? repository.existsByRegistrationIgnoreCase(registration)
                : repository.existsByRegistrationIgnoreCaseAndIdNot(registration, currentId);
        if (exists) {
            throw new IllegalArgumentException("Matrícula já cadastrada.");
        }
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StudentView(
            UUID id,
            String registration,
            String name,
            String nickname,
            boolean active,
            Instant createdAt
    ) {
        static StudentView from(Student student) {
            return new StudentView(
                    student.getId(),
                    student.getRegistration(),
                    student.getName(),
                    student.getNickname(),
                    student.isActive(),
                    student.getCreatedAt()
            );
        }
    }
}
