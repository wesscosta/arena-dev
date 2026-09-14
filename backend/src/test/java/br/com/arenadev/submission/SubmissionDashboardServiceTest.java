
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SubmissionDashboardServiceTest {
    @Test
    void derivesNotStartedFromRosterAndKeepsSubmittedAsPersistedState() {
        ActivityRepository activityRepository = mock(ActivityRepository.class);
        EnrollmentRepository enrollmentRepository = mock(EnrollmentRepository.class);
        ActivitySubmissionRepository submissionRepository = mock(ActivitySubmissionRepository.class);
        SubmissionItemRepository itemRepository = mock(SubmissionItemRepository.class);

        SubmissionDashboardService service = new SubmissionDashboardService(
                activityRepository, enrollmentRepository, submissionRepository, itemRepository
        );

        UUID activityId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();

        Classroom classroom = mock(Classroom.class);
        when(classroom.getId()).thenReturn(classroomId);

        Activity activity = mock(Activity.class);
        when(activity.getId()).thenReturn(activityId);
        when(activity.getTitle()).thenReturn("Projeto integrador");
        when(activity.getClassroom()).thenReturn(classroom);
        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        Student ana = mock(Student.class);
        when(ana.getId()).thenReturn(UUID.randomUUID());
        when(ana.getName()).thenReturn("Ana");
        when(ana.getRegistration()).thenReturn("A001");

        Student bruno = mock(Student.class);
        when(bruno.getId()).thenReturn(UUID.randomUUID());
        when(bruno.getName()).thenReturn("Bruno");
        when(bruno.getRegistration()).thenReturn("B001");

        Enrollment enrollmentAna = mock(Enrollment.class);
        when(enrollmentAna.getId()).thenReturn(UUID.randomUUID());
        when(enrollmentAna.getStudent()).thenReturn(ana);
        when(enrollmentAna.getPreferredName()).thenReturn("Ana");

        Enrollment enrollmentBruno = mock(Enrollment.class);
        when(enrollmentBruno.getId()).thenReturn(UUID.randomUUID());
        when(enrollmentBruno.getStudent()).thenReturn(bruno);

        when(enrollmentRepository.findByClassroomIdAndActiveTrueOrderByStudentNameAsc(classroomId))
                .thenReturn(List.of(enrollmentAna, enrollmentBruno));

        ActivitySubmission submission = mock(ActivitySubmission.class);
        when(submission.getId()).thenReturn(submissionId);
        when(submission.getEnrollment()).thenReturn(enrollmentAna);
        when(submission.getStatus()).thenReturn(ActivitySubmissionStatus.SUBMITTED);
        when(submission.getSource()).thenReturn(SubmissionSource.ARENA);
        when(submission.getAttemptNumber()).thenReturn(1);
        when(submission.getStartedAt()).thenReturn(Instant.parse("2026-09-14T12:00:00Z"));
        when(submission.getSubmittedAt()).thenReturn(Instant.parse("2026-09-14T12:30:00Z"));
        when(submission.getUpdatedAt()).thenReturn(Instant.parse("2026-09-14T12:30:00Z"));

        when(submissionRepository.findByActivityIdOrderByUpdatedAtDesc(activityId)).thenReturn(List.of(submission));
        when(itemRepository.countBySubmissionId(submissionId)).thenReturn(3L);

        SubmissionDashboardService.DashboardView dashboard = service.dashboard(activityId);

        assertThat(dashboard.summary().total()).isEqualTo(2);
        assertThat(dashboard.summary().submitted()).isEqualTo(1);
        assertThat(dashboard.summary().notStarted()).isEqualTo(1);
        assertThat(dashboard.students().getFirst().status()).isEqualTo(SubmissionDashboardStatus.SUBMITTED);
        assertThat(dashboard.students().getFirst().itemCount()).isEqualTo(3);
        assertThat(dashboard.students().getLast().status()).isEqualTo(SubmissionDashboardStatus.NOT_STARTED);
        assertThat(dashboard.students().getLast().submissionId()).isNull();
    }
}
