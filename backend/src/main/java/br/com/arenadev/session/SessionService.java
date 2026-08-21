package br.com.arenadev.session;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.realtime.BuzzerService;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SessionService {
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final ClassroomRepository classroomRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SessionJoinService joinService;
    private final BuzzerService buzzerService;

    public SessionService(
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            ClassroomRepository classroomRepository,
            EnrollmentRepository enrollmentRepository,
            SessionJoinService joinService,
            BuzzerService buzzerService
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.classroomRepository = classroomRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.joinService = joinService;
        this.buzzerService = buzzerService;
    }

    @Transactional
    public SessionView start(UUID classroomId, String title, Set<UUID> presentStudentIds) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
        if (!classroom.isActive()) {
            throw new IllegalArgumentException("Não é possível iniciar sessão para uma turma inativa.");
        }
        if (sessionRepository.existsByClassroomIdAndStatus(classroomId, SessionStatus.ACTIVE)) {
            throw new IllegalArgumentException("Já existe uma sessão ativa para esta turma. Encerre-a antes de iniciar outra.");
        }

        List<Enrollment> enrollments = enrollmentRepository
                .findByClassroomIdAndActiveTrueOrderByStudentNameAsc(classroomId);
        Set<UUID> enrolledIds = enrollments.stream()
                .map(enrollment -> enrollment.getStudent().getId())
                .collect(java.util.stream.Collectors.toSet());
        Set<UUID> requestedPresent = presentStudentIds == null
                ? Set.of()
                : new HashSet<>(presentStudentIds);

        if (!enrolledIds.containsAll(requestedPresent)) {
            throw new IllegalArgumentException("Há alunos marcados como presentes que não pertencem à turma.");
        }

        String normalizedTitle = title == null || title.isBlank() ? "Aula" : title.trim();
        ClassSession session = sessionRepository.save(new ClassSession(classroom, normalizedTitle));

        for (Enrollment enrollment : enrollments) {
            Student student = enrollment.getStudent();
            participantRepository.save(new SessionParticipant(
                    session,
                    student,
                    requestedPresent.contains(student.getId())
            ));
        }

        joinService.ensureCode(session);
        return SessionView.from(session);
    }

    @Transactional(readOnly = true)
    public SessionView get(UUID id) {
        return SessionView.from(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<SessionView> listByClassroom(UUID classroomId) {
        if (!classroomRepository.existsById(classroomId)) {
            throw new ResourceNotFoundException("Turma não encontrada.");
        }
        return sessionRepository.findByClassroomIdOrderByStartedAtDesc(classroomId)
                .stream()
                .map(SessionView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ParticipantView> participants(UUID sessionId) {
        getEntity(sessionId);
        return participantRepository.findBySessionIdOrderByStudentNameAsc(sessionId)
                .stream()
                .map(ParticipantView::from)
                .toList();
    }

    @Transactional
    public ParticipantView updatePresence(UUID sessionId, UUID participantId, boolean present) {
        ClassSession session = getEntity(sessionId);
        ensureActive(session);
        SessionParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado."));
        if (!participant.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("Participante não pertence à sessão informada.");
        }
        participant.setPresent(present);
        return ParticipantView.from(participant);
    }

    @Transactional
    public SessionView finish(UUID sessionId) {
        ClassSession session = getEntity(sessionId);
        ensureActive(session);
        session.finish();
        joinService.deactivate(sessionId);
        buzzerService.closeForFinishedSession(sessionId);
        return SessionView.from(session);
    }

    private ClassSession getEntity(UUID id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private static void ensureActive(ClassSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
    }

    public record SessionView(
            UUID id,
            UUID classroomId,
            String classroomName,
            String title,
            SessionStatus status,
            Instant startedAt,
            Instant endedAt
    ) {
        static SessionView from(ClassSession session) {
            return new SessionView(
                    session.getId(),
                    session.getClassroom().getId(),
                    session.getClassroom().getName(),
                    session.getTitle(),
                    session.getStatus(),
                    session.getStartedAt(),
                    session.getEndedAt()
            );
        }
    }

    public record ParticipantView(
            UUID id,
            UUID studentId,
            String registration,
            String name,
            String nickname,
            boolean present,
            boolean connected
    ) {
        static ParticipantView from(SessionParticipant participant) {
            Student student = participant.getStudent();
            return new ParticipantView(
                    participant.getId(),
                    student.getId(),
                    student.getRegistration(),
                    student.getName(),
                    student.getNickname(),
                    participant.isPresent(),
                    participant.isConnected()
            );
        }
    }
}
