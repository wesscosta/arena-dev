package br.com.arenadev.classroom;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class StudentService {
    private static final Pattern EMAIL_SHAPE = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
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
        return create(registration, name, nickname, null);
    }

    /**
     * The teacher registers a student by name, by e-mail or both. With the
     * e-mail alone, the address' local part stands in for the name until the
     * student completes the registration.
     */
    @Transactional
    public StudentView create(String registration, String name, String nickname, String email) {
        String normalizedRegistration = normalizeOptional(registration);
        String normalizedName = normalizeOptional(name);
        String normalizedEmail = normalizeEmail(email);
        if (normalizedName == null && normalizedEmail == null) {
            throw new IllegalArgumentException("Informe o nome ou o e-mail do aluno.");
        }
        validateRegistrationAvailable(normalizedRegistration, null);
        validateEmailAvailable(normalizedEmail, null);
        Student student = new Student(
                normalizedRegistration,
                normalizedName != null ? normalizedName : placeholderName(normalizedEmail),
                normalizeOptional(nickname)
        );
        if (normalizedName == null) student.markNamePending();
        student.setEmailByTeacher(normalizedEmail);
        return StudentView.from(repository.save(student));
    }

    @Transactional
    public StudentView update(UUID id, String registration, String name, String nickname, boolean active) {
        Student student = findStudent(id);
        String normalizedRegistration = normalizeOptional(registration);
        validateRegistrationAvailable(normalizedRegistration, id);
        student.update(normalizedRegistration, name.trim(), normalizeOptional(nickname), active);
        return StudentView.from(student);
    }

    /** Teacher edit of the e-mail; an empty value removes it. */
    @Transactional
    public StudentView updateEmail(UUID id, String email) {
        Student student = findStudent(id);
        String normalizedEmail = normalizeEmail(email);
        validateEmailAvailable(normalizedEmail, id);
        student.setEmailByTeacher(normalizedEmail);
        return StudentView.from(student);
    }

    /**
     * The student finishes the registration: the name only while it is still
     * the e-mail placeholder, the e-mail only while the teacher has not set it.
     */
    @Transactional
    public StudentView completeByStudent(UUID id, String name, String email) {
        Student student = findStudent(id);
        String normalizedName = normalizeOptional(name);
        if (student.isNamePending() && normalizedName == null) {
            throw new IllegalArgumentException("Informe seu nome completo.");
        }
        if (!student.isNamePending()) {
            normalizedName = null;
        }
        String normalizedEmail = normalizeEmail(email);
        if (student.getEmailSource() == Student.EmailSource.TEACHER) {
            if (normalizedEmail != null && !normalizedEmail.equals(student.getEmail())) {
                throw new IllegalArgumentException("Seu e-mail foi cadastrado pelo professor. Peça a ele para alterar.");
            }
        } else {
            validateEmailAvailable(normalizedEmail, id);
        }
        student.completeByStudent(normalizedName, normalizedEmail);
        return StudentView.from(student);
    }

    private Student findStudent(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado."));
    }

    private void validateEmailAvailable(String email, UUID currentId) {
        if (email == null) {
            return;
        }
        boolean exists = currentId == null
                ? repository.existsByEmailIgnoreCase(email)
                : repository.existsByEmailIgnoreCaseAndIdNot(email, currentId);
        if (exists) {
            throw new IllegalArgumentException("Este e-mail já está em uso por outro aluno. Fale com o professor.");
        }
    }

    /** Lower-cased and trimmed; null when blank. No verification in this version, only the shape. */
    public static String normalizeEmail(String value) {
        String email = normalizeOptional(value);
        if (email == null) {
            return null;
        }
        email = email.toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL_SHAPE.matcher(email).matches()) {
            throw new IllegalArgumentException("E-mail inválido.");
        }
        return email;
    }

    private static String placeholderName(String email) {
        String localPart = email.substring(0, email.indexOf('@'));
        return localPart.length() > 140 ? localPart.substring(0, 140) : localPart;
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
            Instant createdAt,
            boolean anonymized,
            String email,
            Student.EmailSource emailSource,
            boolean namePending
    ) {
        static StudentView from(Student student) {
            return new StudentView(
                    student.getId(),
                    student.getRegistration(),
                    student.getName(),
                    student.getNickname(),
                    student.isActive(),
                    student.getCreatedAt(),
                    student.isAnonymized(),
                    student.getEmail(),
                    student.getEmailSource(),
                    student.isNamePending()
            );
        }
    }
}
