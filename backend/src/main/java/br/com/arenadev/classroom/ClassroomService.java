package br.com.arenadev.classroom;

import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.scoring.ScoreEventRepository;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ClassroomService {
    private static final Set<String> THEME_COLORS = Set.of(
            "emerald", "teal", "blue", "indigo", "violet", "amber", "orange", "rose"
    );
    private static final Set<String> THEME_ICONS = Set.of(
            "code", "terminal", "database", "network", "computer", "project", "business", "math"
    );
    private final ClassroomRepository classroomRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClassSessionRepository classSessionRepository;
    private final ActivityRepository activityRepository;
    private final ScoreEventRepository scoreEventRepository;

    public ClassroomService(
            ClassroomRepository classroomRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            ClassSessionRepository classSessionRepository,
            ActivityRepository activityRepository,
            ScoreEventRepository scoreEventRepository
    ) {
        this.classroomRepository = classroomRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.classSessionRepository = classSessionRepository;
        this.activityRepository = activityRepository;
        this.scoreEventRepository = scoreEventRepository;
    }

    @Transactional(readOnly = true)
    public List<ClassroomView> list(boolean includeInactive) {
        List<Classroom> classrooms = includeInactive
                ? classroomRepository.findAllByOrderByNameAsc()
                : classroomRepository.findByActiveTrueOrderByNameAsc();
        return classrooms.stream().map(ClassroomView::from).toList();
    }

    @Transactional
    public ClassroomView create(String name, String code) {
        return create(name, code, null, null);
    }

    @Transactional
    public ClassroomView create(String name, String code, String themeColor, String themeIcon) {
        String normalizedCode = normalizeOptionalCode(code);
        if (normalizedCode != null && classroomRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Código da turma já está em uso.");
        }
        Classroom classroom = new Classroom(name.trim(), normalizedCode);
        classroom.update(
                name.trim(),
                normalizedCode,
                true,
                normalizeThemeColor(themeColor, "emerald"),
                normalizeThemeIcon(themeIcon, "code")
        );
        return ClassroomView.from(classroomRepository.save(classroom));
    }

    @Transactional
    public ClassroomView update(UUID id, String name, String code, boolean active) {
        return update(id, name, code, active, null, null);
    }

    @Transactional
    public ClassroomView update(
            UUID id,
            String name,
            String code,
            boolean active,
            String themeColor,
            String themeIcon
    ) {
        Classroom classroom = getClassroom(id);
        String normalizedCode = normalizeOptionalCode(code);
        if (normalizedCode != null && classroomRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
            throw new IllegalArgumentException("Código da turma já está em uso.");
        }
        if (!active && classroom.isActive() && classSessionRepository.existsByClassroomIdAndStatus(id, SessionStatus.ACTIVE)) {
            throw new IllegalArgumentException("Encerre a sessão ativa antes de arquivar a turma.");
        }
        classroom.update(
                name.trim(),
                normalizedCode,
                active,
                normalizeThemeColor(themeColor, classroom.getThemeColor()),
                normalizeThemeIcon(themeIcon, classroom.getThemeIcon())
        );
        return ClassroomView.from(classroom);
    }

    @Transactional
    public void delete(UUID id) {
        Classroom classroom = getClassroom(id);
        boolean hasOperationalHistory = classSessionRepository.existsByClassroomId(id)
                || activityRepository.existsByClassroomId(id)
                || scoreEventRepository.existsByClassroomId(id);
        if (hasOperationalHistory) {
            throw new IllegalArgumentException("Esta turma possui histórico operacional. Inative a turma para preservar sessões, atividades e XP.");
        }
        enrollmentRepository.deleteByClassroomId(id);
        classroomRepository.delete(classroom);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentView> students(UUID classroomId, boolean includeInactive) {
        getClassroom(classroomId);
        List<Enrollment> enrollments = includeInactive
                ? enrollmentRepository.findByClassroomIdOrderByStudentNameAsc(classroomId)
                : enrollmentRepository.findByClassroomIdAndActiveTrueOrderByStudentNameAsc(classroomId);
        return enrollments.stream().map(EnrollmentView::from).toList();
    }

    @Transactional
    public EnrollmentView enroll(UUID classroomId, UUID studentId) {
        Classroom classroom = getClassroom(classroomId);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado."));

        Enrollment enrollment = enrollmentRepository.findByClassroomIdAndStudentId(classroomId, studentId)
                .orElseGet(() -> enrollmentRepository.save(new Enrollment(classroom, student)));
        enrollment.setActive(true);
        return EnrollmentView.from(enrollment);
    }

    @Transactional
    public EnrollmentView updatePreferredName(UUID classroomId, UUID studentId, String preferredName) {
        Enrollment enrollment = enrollmentRepository.findByClassroomIdAndStudentId(classroomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula do aluno na turma não encontrada."));
        enrollment.setPreferredName(preferredName);
        return EnrollmentView.from(enrollment);
    }

    @Transactional
    public EnrollmentView setEnrollmentActive(UUID classroomId, UUID studentId, boolean active) {
        Enrollment enrollment = enrollmentRepository.findByClassroomIdAndStudentId(classroomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula do aluno na turma não encontrada."));
        enrollment.setActive(active);
        return EnrollmentView.from(enrollment);
    }

    @Transactional
    public void remove(UUID classroomId, UUID studentId) {
        Enrollment enrollment = enrollmentRepository.findByClassroomIdAndStudentId(classroomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula do aluno na turma não encontrada."));
        enrollmentRepository.delete(enrollment);
    }

    private Classroom getClassroom(UUID id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
    }

    private static String normalizeOptionalCode(String code) {
        return code == null || code.isBlank() ? null : code.trim().toUpperCase();
    }

    private static String normalizeThemeColor(String value, String fallback) {
        String normalized = value == null || value.isBlank()
                ? fallback
                : value.trim().toLowerCase(Locale.ROOT);
        if (!THEME_COLORS.contains(normalized)) {
            throw new IllegalArgumentException("Cor da turma inválida.");
        }
        return normalized;
    }

    private static String normalizeThemeIcon(String value, String fallback) {
        String normalized = value == null || value.isBlank()
                ? fallback
                : value.trim().toLowerCase(Locale.ROOT);
        if (!THEME_ICONS.contains(normalized)) {
            throw new IllegalArgumentException("Ícone da turma inválido.");
        }
        return normalized;
    }

    public record ClassroomView(
            UUID id,
            String name,
            String code,
            boolean active,
            String themeColor,
            String themeIcon,
            Instant createdAt
    ) {
        static ClassroomView from(Classroom classroom) {
            return new ClassroomView(
                    classroom.getId(),
                    classroom.getName(),
                    classroom.getCode(),
                    classroom.isActive(),
                    classroom.getThemeColor(),
                    classroom.getThemeIcon(),
                    classroom.getCreatedAt()
            );
        }
    }

    public record EnrollmentView(
            UUID enrollmentId,
            UUID studentId,
            String registration,
            String name,
            String nickname,
            String preferredName,
            boolean studentActive,
            boolean enrollmentActive,
            Instant joinedAt
    ) {
        static EnrollmentView from(Enrollment enrollment) {
            Student student = enrollment.getStudent();
            return new EnrollmentView(
                    enrollment.getId(),
                    student.getId(),
                    student.getRegistration(),
                    student.getName(),
                    student.getNickname(),
                    enrollment.getPreferredName(),
                    student.isActive(),
                    enrollment.isActive(),
                    enrollment.getJoinedAt()
            );
        }
    }
}
