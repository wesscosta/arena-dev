package br.com.arenadev.scoring;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.ranking.SessionRankingService;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.sessionevent.SessionEventActor;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import java.util.Map;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final ActivityRepository activityRepository;
    private final ActivityQuestionRepository activityQuestionRepository;
    private final SessionRankingService rankingService;
    private final SessionEventService sessionEvents;
    private final JdbcTemplate jdbc;

    public ScoreEventService(
            ScoreEventRepository scoreEventRepository,
            ClassroomRepository classroomRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            ActivityRepository activityRepository,
            ActivityQuestionRepository activityQuestionRepository,
            SessionRankingService rankingService,
            SessionEventService sessionEvents,
            JdbcTemplate jdbc
    ) {
        this.scoreEventRepository = scoreEventRepository;
        this.classroomRepository = classroomRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.activityRepository = activityRepository;
        this.activityQuestionRepository = activityQuestionRepository;
        this.rankingService = rankingService;
        this.sessionEvents = sessionEvents;
        this.jdbc = jdbc;
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
        if (command == null) throw new IllegalArgumentException("Lançamento de XP inválido.");
        // PostgreSQL transaction advisory lock serializes concurrent requests with the same
        // client UUID. The unique index remains the final protection across all writers.
        if (command.requestId() != null) {
            jdbc.queryForList("select pg_advisory_xact_lock(?, ?)", 0x53434f52, command.requestId().hashCode());
            var previous = scoreEventRepository.findByCreateRequestId(command.requestId());
            if (previous.isPresent()) {
                ScoreEvent existing = previous.get();
                if (!sameCreateCommand(existing, command)) {
                    throw new ScoreConflictException("Chave de lançamento reutilizada com dados diferentes.");
                }
                // Already committed: no second insert, no duplicated ranking publication.
                return ScoreEventView.from(existing, scoreEventRepository.existsByReversalOfId(existing.getId()));
            }
        }
        ScoreEvent event = build(command);
        if (command.requestId() != null) event.setCreateRequestId(command.requestId());
        ScoreEvent saved = scoreEventRepository.saveAndFlush(event);
        rankingService.publishScoreChange(saved.getSession() == null ? null : saved.getSession().getId());
        return ScoreEventView.from(saved, false);
    }

    private static boolean sameCreateCommand(ScoreEvent event, CreateScoreEvent request) {
        return event.getClassroom().getId().equals(request.classroomId())
                && event.getStudent().getId().equals(request.studentId())
                && java.util.Objects.equals(event.getSession() == null ? null : event.getSession().getId(), request.sessionId())
                && event.getPoints() == request.points()
                && event.getCategory() == request.category()
                && event.getDescription().equals(normalizeDescription(request.description()))
                && event.getSource() == (request.source() == null ? ScoreSource.MANUAL : request.source())
                && java.util.Objects.equals(event.getActivityRef(), request.activityId())
                && java.util.Objects.equals(event.getQuestionRef(), request.questionId());
    }

    @Transactional
    public List<ScoreEventView> createBatch(List<CreateScoreEvent> commands) {
        if (commands == null || commands.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um lançamento de XP.");
        }
        if (commands.size() > 500) {
            throw new IllegalArgumentException("O lote excede o limite de 500 lançamentos.");
        }
        List<ScoreEvent> saved = commands.stream()
                .map(this::build)
                .map(scoreEventRepository::save)
                .toList();
        saved.stream()
                .map(ScoreEvent::getSession)
                .filter(java.util.Objects::nonNull)
                .map(ClassSession::getId)
                .distinct()
                .forEach(rankingService::publishScoreChange);
        return saved.stream()
                .map(event -> ScoreEventView.from(event, false))
                .toList();
    }

    @Transactional
    public ScoreEventView reverse(UUID eventId) {
        return reverse(eventId, null);
    }

    /** Serializes corrections against the original row; the V3 unique constraint is a second guard. */
    @Transactional
    public ScoreEventView reverse(UUID eventId, UUID requestId) {
        ScoreEvent original = scoreEventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento de XP não encontrado."));
        if (original.getReversalOf() != null) {
            throw new IllegalArgumentException("Um evento de reversão não pode ser revertido diretamente.");
        }
        var previous = scoreEventRepository.findByReversalOfId(eventId);
        if (previous.isPresent()) {
            if (requestId != null && requestId.equals(previous.get().getReversalRequestId())) {
                return ScoreEventView.from(previous.get(), false);
            }
            if (requestId != null) {
                throw new ScoreConflictException("Este lançamento de XP já possui outra reversão registrada.");
            }
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
        if (requestId != null) reversal.setReversalRequestId(requestId);
        ScoreEvent saved = scoreEventRepository.saveAndFlush(reversal);
        if (original.getSession() != null) {
            sessionEvents.record(original.getSession(), SessionEventType.SCORE_EVENT_REVERSED,
                    SessionEventActor.TEACHER, "Correção de XP registrada",
                    Map.of("originalEventId", original.getId().toString(),
                            "reversalEventId", saved.getId().toString(),
                            "pointsReversed", original.getPoints()));
        }
        rankingService.publishScoreChange(saved.getSession() == null ? null : saved.getSession().getId());
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

        String activityRef = validateActivityReference(classroom, command.activityId());
        String questionRef = validateQuestionReference(activityRef, command.questionId());

        ScoreSource source = command.source() == null ? ScoreSource.MANUAL : command.source();
        return new ScoreEvent(
                classroom,
                student,
                session,
                command.points(),
                command.category(),
                normalizeDescription(command.description()),
                source,
                activityRef,
                questionRef,
                null
        );
    }

    private String validateActivityReference(Classroom classroom, String value) {
        if (value == null || value.isBlank()) return null;
        UUID activityId;
        try { activityId = UUID.fromString(value.trim()); }
        catch (IllegalArgumentException ex) { throw new IllegalArgumentException("Referência de atividade inválida."); }
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
        if (!activity.getClassroom().getId().equals(classroom.getId())) {
            throw new IllegalArgumentException("Atividade não pertence à turma informada.");
        }
        return activityId.toString();
    }

    private String validateQuestionReference(String activityRef, String value) {
        if (value == null || value.isBlank()) return null;
        if (activityRef == null) throw new IllegalArgumentException("Questão exige uma atividade de origem.");
        UUID questionId;
        try { questionId = UUID.fromString(value.trim()); }
        catch (IllegalArgumentException ex) { throw new IllegalArgumentException("Referência de questão inválida."); }
        ActivityQuestion question = activityQuestionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Questão não encontrada."));
        if (!question.getActivity().getId().toString().equals(activityRef)) {
            throw new IllegalArgumentException("Questão não pertence à atividade informada.");
        }
        return questionId.toString();
    }

    private static String normalizeDescription(String value) {
        String normalized = value == null || value.isBlank() ? "Ajuste de XP" : value.trim();
        return normalized.length() <= 300 ? normalized : normalized.substring(0, 300);
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
            String questionId,
            UUID requestId
    ) {
        /** Existing batch/quiz/draw callsites remain compatible; their own idempotency contracts differ. */
        public CreateScoreEvent(UUID classroomId, UUID studentId, UUID sessionId,
                int points, ScoreCategory category, String description, ScoreSource source,
                String activityId, String questionId) {
            this(classroomId, studentId, sessionId, points, category, description, source,
                    activityId, questionId, null);
        }
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
