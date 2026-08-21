package br.com.arenadev.classroom;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ClassroomService {
    private final ClassroomRepository classroomRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public ClassroomService(
            ClassroomRepository classroomRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this.classroomRepository = classroomRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
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
        String normalizedCode = normalizeOptionalCode(code);
        if (normalizedCode != null && classroomRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Código da turma já está em uso.");
        }
        Classroom classroom = classroomRepository.save(new Classroom(name.trim(), normalizedCode));
        return ClassroomView.from(classroom);
    }

    @Transactional
    public ClassroomView update(UUID id, String name, String code, boolean active) {
        Classroom classroom = getClassroom(id);
        String normalizedCode = normalizeOptionalCode(code);
        if (normalizedCode != null && classroomRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
            throw new IllegalArgumentException("Código da turma já está em uso.");
        }
        classroom.update(name.trim(), normalizedCode, active);
        return ClassroomView.from(classroom);
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

    public record ClassroomView(
            UUID id,
            String name,
            String code,
            boolean active,
            Instant createdAt
    ) {
        static ClassroomView from(Classroom classroom) {
            return new ClassroomView(
                    classroom.getId(),
                    classroom.getName(),
                    classroom.getCode(),
                    classroom.isActive(),
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
                    student.isActive(),
                    enrollment.isActive(),
                    enrollment.getJoinedAt()
            );
        }
    }
}
