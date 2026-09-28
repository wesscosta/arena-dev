package br.com.arenadev.study;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.session.SessionJoinCode;
import br.com.arenadev.session.SessionJoinCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StudentLiveDiscoveryService {
    private final EnrollmentRepository enrollments;
    private final SessionJoinCodeRepository joinCodes;

    public StudentLiveDiscoveryService(EnrollmentRepository enrollments, SessionJoinCodeRepository joinCodes) {
        this.enrollments = enrollments;
        this.joinCodes = joinCodes;
    }

    @Transactional(readOnly = true)
    public List<LiveSessionSummary> list(StudyPrincipal principal) {
        List<UUID> classroomIds = enrollments.findByStudentIdAndActiveTrue(principal.userId()).stream()
                .filter(enrollment -> enrollment.getClassroom().isActive())
                .map(Enrollment::getClassroom)
                .map(classroom -> classroom.getId())
                .distinct()
                .toList();
        if (classroomIds.isEmpty()) return List.of();

        Instant now = Instant.now();
        return joinCodes.findBySessionClassroomIdInAndActiveTrueOrderBySessionStartedAtDesc(classroomIds).stream()
                .filter(code -> code.isUsableAt(now))
                .map(LiveSessionSummary::from)
                .toList();
    }

    public record LiveSessionSummary(
            UUID sessionId,
            UUID classroomId,
            String classroomName,
            String sessionTitle,
            String joinCode,
            Instant startedAt
    ) {
        static LiveSessionSummary from(SessionJoinCode code) {
            var session = code.getSession();
            return new LiveSessionSummary(
                    session.getId(),
                    session.getClassroom().getId(),
                    session.getClassroom().getName(),
                    session.getTitle(),
                    code.getCode(),
                    session.getStartedAt()
            );
        }
    }
}
