
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SubmissionDashboardService {
    private final ActivityRepository activityRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionItemRepository itemRepository;

    public SubmissionDashboardService(
            ActivityRepository activityRepository,
            EnrollmentRepository enrollmentRepository,
            ActivitySubmissionRepository submissionRepository,
            SubmissionItemRepository itemRepository
    ) {
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public DashboardView dashboard(UUID activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));

        List<Enrollment> enrollments = enrollmentRepository
                .findByClassroomIdAndActiveTrueOrderByStudentNameAsc(activity.getClassroom().getId());

        Map<UUID, ActivitySubmission> latestByEnrollment = submissionRepository
                .findByActivityIdOrderByUpdatedAtDesc(activityId)
                .stream()
                .collect(Collectors.toMap(
                        submission -> submission.getEnrollment().getId(),
                        Function.identity(),
                        this::newerAttempt,
                        LinkedHashMap::new
                ));

        List<StudentRow> students = enrollments.stream()
                .map(enrollment -> row(enrollment, latestByEnrollment.get(enrollment.getId())))
                .toList();

        return new DashboardView(
                activity.getId(),
                activity.getTitle(),
                activity.getClassroom().getId(),
                summarize(students),
                students
        );
    }

    private ActivitySubmission newerAttempt(ActivitySubmission first, ActivitySubmission second) {
        if (first.getAttemptNumber() != second.getAttemptNumber()) {
            return first.getAttemptNumber() > second.getAttemptNumber() ? first : second;
        }
        Instant firstUpdated = first.getUpdatedAt();
        Instant secondUpdated = second.getUpdatedAt();
        if (firstUpdated == null) return second;
        if (secondUpdated == null) return first;
        return firstUpdated.isAfter(secondUpdated) ? first : second;
    }

    private StudentRow row(Enrollment enrollment, ActivitySubmission submission) {
        Student student = enrollment.getStudent();

        if (submission == null) {
            return new StudentRow(
                    enrollment.getId(), student.getId(), student.getName(), displayName(enrollment, student),
                    student.getRegistration(), SubmissionDashboardStatus.NOT_STARTED,
                    null, null, null, null, null, null, 0
            );
        }

        return new StudentRow(
                enrollment.getId(), student.getId(), student.getName(), displayName(enrollment, student),
                student.getRegistration(), SubmissionDashboardStatus.from(submission.getStatus()),
                submission.getId(), submission.getSource(), submission.getAttemptNumber(),
                submission.getStartedAt(), submission.getSubmittedAt(), submission.getUpdatedAt(),
                itemRepository.countBySubmissionId(submission.getId())
        );
    }

    private String displayName(Enrollment enrollment, Student student) {
        if (enrollment.getPreferredName() != null && !enrollment.getPreferredName().isBlank()) {
            return enrollment.getPreferredName();
        }
        if (student.getNickname() != null && !student.getNickname().isBlank()) {
            return student.getNickname();
        }
        return student.getName();
    }

    private Summary summarize(List<StudentRow> rows) {
        EnumMap<SubmissionDashboardStatus, Long> counts = new EnumMap<>(SubmissionDashboardStatus.class);
        for (SubmissionDashboardStatus status : SubmissionDashboardStatus.values()) counts.put(status, 0L);
        for (StudentRow row : rows) counts.compute(row.status(), (ignored, value) -> value == null ? 1L : value + 1L);

        return new Summary(
                rows.size(),
                counts.get(SubmissionDashboardStatus.NOT_STARTED),
                counts.get(SubmissionDashboardStatus.IN_PROGRESS),
                counts.get(SubmissionDashboardStatus.SUBMITTED),
                counts.get(SubmissionDashboardStatus.UNDER_REVIEW),
                counts.get(SubmissionDashboardStatus.GRADED),
                counts.get(SubmissionDashboardStatus.RETURNED)
        );
    }

    public record DashboardView(UUID activityId, String activityTitle, UUID classroomId, Summary summary, List<StudentRow> students) {}
    public record Summary(int total, long notStarted, long inProgress, long submitted, long underReview, long graded, long returned) {}
    public record StudentRow(
            UUID enrollmentId,
            UUID studentId,
            String studentName,
            String displayName,
            String registration,
            SubmissionDashboardStatus status,
            UUID submissionId,
            SubmissionSource source,
            Integer attemptNumber,
            Instant startedAt,
            Instant submittedAt,
            Instant updatedAt,
            long itemCount
    ) {}
}
