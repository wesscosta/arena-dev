package br.com.arenadev.scoring;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ScoreEventService {
    private final ScoreEventRepository scoreEventRepository;
    private final ClassroomRepository classroomRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;

    public ScoreEventService(
            ScoreEventRepository scoreEventRepository,
            ClassroomRepository classroomRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository
    ) {
        this.scoreEventRepository = scoreEventRepository;
        this.classroomRepository = classroomRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
    }

    @Transactional(readOnly = true)
    public List<ScoreEventView> list(UUID classroomId) {
        if (!classroomRepository.existsById(classroomId)) {
            throw new ResourceNotFoundException("Turma não encontrada.");
        }
        List<ScoreEvent> events = scoreEventRepository.findByClassroomIdOrderByCreatedAtAsc(classroomId);
        Set<UUID> reversedIds = new HashSet<>();
        for (ScoreEvent event : events) {
            if (event.getReversalOf() != null) reversedIds.add(event.getReversalOf().getId());
        }
        return events.stream().map(event -> ScoreEventView.from(event, reversedIds.contains(event.getId()))).toList();
    }

    @Transactional
    public ScoreEventView create(CreateScoreEvent command) {
        return ScoreEventView.from(scoreEventRepository.save(build(command)), false);
    }

    @Transactional
    public List<ScoreEventView> createBatch(List<CreateScoreEvent> commands) {
        if (commands == null || commands.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um lançamento de XP.");
        }
        if (commands.size() > 500) {
            throw new IllegalArgumentException("O lote excede o limite de 500 lançamentos.");
        }
        return commands.stream()
                .map(this::build)
                .map(scoreEventRepository::save)
                .map(event -> ScoreEventView.from(event, false))
                .toList();
    }

    @Transactional
    public ScoreEventView reverse(UUID eventId) {
        ScoreEvent original = scoreEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento de XP não encontrado."));
        if (original.getReversalOf() != null) {
            throw new IllegalArgumentException("Um evento de reversão não pode ser revertido diretamente.");
        }
        if (scoreEventRepository.existsByReversalOfId(eventId)) {
            throw new IllegalArgumentException("Este lançamento já foi revertido.");
        }

        ScoreEvent reversal = new ScoreEvent(
                original.getClassroom(),
                original.getStudent(),
                original.getSession(),
                -original.getPoints(),
                ScoreCategory.ADJUSTMENT,
                normalizeDescription("Reversão: " + original.getDescription()),
                original.getSource(),
                original.getActivityRef(),
                original.getQuestionRef(),
                original
        );
        ScoreEvent saved = scoreEventRepository.save(reversal);
        return ScoreEventView.from(saved, false);
    }

    private ScoreEvent build(CreateScoreEvent command) {
        if (command == null) throw new IllegalArgumentException("Lançamento de XP inválido.");
        if (command.classroomId() == null || command.studentId() == null) {
            throw new IllegalArgumentException("Turma e aluno são obrigatórios.");
        }
        if (command.points() == 0) throw new IllegalArgumentException("A pontuação não pode ser zero.");
        if (command.category() == null) throw new IllegalArgumentException("Informe a categoria do lançamento.");

        Classroom classroom = classroomRepository.findById(command.classroomId())
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
        Student student = studentRepository.findById(command.studentId())
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado."));
        Enrollment enrollment = enrollmentRepository.findByClassroomIdAndStudentId(classroom.getId(), student.getId())
                .orElseThrow(() -> new IllegalArgumentException("Aluno não pertence à turma informada."));
        if (!enrollment.isActive()) {
            throw new IllegalArgumentException("Aluno não possui matrícula ativa nesta turma.");
        }

        ClassSession session = null;
        if (command.sessionId() != null) {
            session = sessionRepository.findById(command.sessionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
            if (!session.getClassroom().getId().equals(classroom.getId())) {
                throw new IllegalArgumentException("Sessão não pertence à turma informada.");
            }
            if (!participantRepository.existsBySessionIdAndStudentId(session.getId(), student.getId())) {
                throw new IllegalArgumentException("Aluno não pertence à sessão informada.");
            }
        }

        ScoreSource source = command.source() == null ? ScoreSource.MANUAL : command.source();
        return new ScoreEvent(
                classroom,
                student,
                session,
                command.points(),
                command.category(),
                normalizeDescription(command.description()),
                source,
                normalizeRef(command.activityId()),
                normalizeRef(command.questionId()),
                null
        );
    }

    private static String normalizeDescription(String value) {
        String normalized = value == null || value.isBlank() ? "Ajuste de XP" : value.trim();
        return normalized.length() <= 300 ? normalized : normalized.substring(0, 300);
    }

    private static String normalizeRef(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120);
    }

    public record CreateScoreEvent(
            UUID classroomId,
            UUID studentId,
            UUID sessionId,
            int points,
            ScoreCategory category,
            String description,
            ScoreSource source,
            String activityId,
            String questionId
    ) {
    }

    public record ScoreEventView(
            UUID id,
            UUID classroomId,
            UUID studentId,
            UUID sessionId,
            int points,
            ScoreCategory category,
            String description,
            ScoreSource source,
            String activityId,
            String questionId,
            Instant createdAt,
            UUID reversalOf,
            boolean reversed
    ) {
        static ScoreEventView from(ScoreEvent event, boolean reversed) {
            return new ScoreEventView(
                    event.getId(),
                    event.getClassroom().getId(),
                    event.getStudent().getId(),
                    event.getSession() == null ? null : event.getSession().getId(),
                    event.getPoints(),
                    event.getCategory(),
                    event.getDescription(),
                    event.getSource(),
                    event.getActivityRef(),
                    event.getQuestionRef(),
                    event.getCreatedAt(),
                    event.getReversalOf() == null ? null : event.getReversalOf().getId(),
                    reversed
            );
        }
    }
}
