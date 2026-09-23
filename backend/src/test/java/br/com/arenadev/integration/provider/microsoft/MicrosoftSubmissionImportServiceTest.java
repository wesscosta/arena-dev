package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.persistence.ExternalActivityLinkEntity;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkEntity;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkRepository;
import br.com.arenadev.integration.persistence.ExternalStudentLinkEntity;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import br.com.arenadev.submission.ActivitySubmission;
import br.com.arenadev.submission.ActivitySubmissionRepository;
import br.com.arenadev.submission.ActivitySubmissionStatus;
import br.com.arenadev.submission.SubmissionSource;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MicrosoftSubmissionImportServiceTest {
    private final MicrosoftSubmissionTrackingService tracking = mock(MicrosoftSubmissionTrackingService.class);
    private final ActivityRepository activities = mock(ActivityRepository.class);
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final ActivitySubmissionRepository submissions = mock(ActivitySubmissionRepository.class);
    private final ExternalActivityLinkRepository activityLinks = mock(ExternalActivityLinkRepository.class);
    private final ExternalStudentLinkRepository studentLinks = mock(ExternalStudentLinkRepository.class);
    private final ExternalSubmissionLinkRepository externalSubmissionLinks = mock(ExternalSubmissionLinkRepository.class);
    private final ExternalLinkService externalLinks = mock(ExternalLinkService.class);

    private final MicrosoftSubmissionImportService service = new MicrosoftSubmissionImportService(
            tracking,
            activities,
            enrollments,
            submissions,
            activityLinks,
            studentLinks,
            externalSubmissionLinks,
            externalLinks
    );

    @Test
    void importsOnlyDeliveredMatchedSubmissionAndKeepsExternalSource() throws Exception {
        UUID connectionId = UUID.randomUUID();
        UUID classroomLinkId = UUID.randomUUID();
        UUID activityLinkId = UUID.randomUUID();
        UUID studentLinkId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();
        UUID localSubmissionId = UUID.randomUUID();
        UUID externalLinkId = UUID.randomUUID();

        var classroom = new Classroom("TDS", "TDS");
        var student = new Student("2026-01", "Maria", null);
        var enrollment = new Enrollment(classroom, student);
        var activity = new Activity(classroom, "Projeto API");

        var activityLink = mock(ExternalActivityLinkEntity.class);
        when(activityLink.getConnectionId()).thenReturn(connectionId);
        when(activityLink.getExternalClassroomLinkId()).thenReturn(classroomLinkId);
        when(activityLink.getActivityId()).thenReturn(activityId);

        var studentLink = mock(ExternalStudentLinkEntity.class);
        when(studentLink.getConnectionId()).thenReturn(connectionId);
        when(studentLink.getEnrollmentId()).thenReturn(enrollmentId);
        when(studentLink.getId()).thenReturn(studentLinkId);

        var trackingItem = new MicrosoftSubmissionTrackingService.TrackingItem(
                "ms-sub-1",
                "ms-user-1",
                studentLinkId,
                enrollmentId,
                "Maria",
                "submitted",
                MicrosoftSubmissionDeliveryStatus.DELIVERED,
                OffsetDateTime.parse("2026-09-19T18:00:00Z"),
                null,
                null,
                null
        );

        when(externalSubmissionLinks.findByConnectionIdAndExternalSubmissionId(connectionId, "ms-sub-1"))
                .thenReturn(Optional.empty());
        when(tracking.track(connectionId, classroomLinkId, activityLinkId))
                .thenReturn(new MicrosoftSubmissionTrackingService.TrackingResult(
                        connectionId,
                        classroomLinkId,
                        activityLinkId,
                        activityId,
                        "Projeto API",
                        "assignment-1",
                        List.of(trackingItem),
                        1, 0, 0, 0
                ));
        when(activityLinks.findById(activityLinkId)).thenReturn(Optional.of(activityLink));
        when(studentLinks.findById(studentLinkId)).thenReturn(Optional.of(studentLink));
        when(activities.findById(activityId)).thenReturn(Optional.of(activity));
        when(enrollments.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
        when(submissions.findByActivityIdOrderByUpdatedAtDesc(activityId)).thenReturn(List.of());
        when(submissions.save(any(ActivitySubmission.class))).thenAnswer(invocation -> {
            ActivitySubmission value = invocation.getArgument(0);
            var id = ActivitySubmission.class.getDeclaredField("id");
            id.setAccessible(true);
            id.set(value, localSubmissionId);
            return value;
        });

        var externalLink = mock(ExternalSubmissionLinkEntity.class);
        when(externalLink.getId()).thenReturn(externalLinkId);
        when(externalLinks.linkSubmission(
                connectionId,
                activityLinkId,
                studentLinkId,
                localSubmissionId,
                "ms-sub-1"
        )).thenReturn(externalLink);

        var result = service.importDelivered(
                connectionId,
                classroomLinkId,
                activityLinkId,
                "ms-sub-1"
        );

        assertThat(result.changed()).isTrue();
        assertThat(result.submissionId()).isEqualTo(localSubmissionId);
        assertThat(result.attemptNumber()).isEqualTo(1);
        assertThat(result.source()).isEqualTo(SubmissionSource.EXTERNAL.name());
        assertThat(result.status()).isEqualTo(ActivitySubmissionStatus.SUBMITTED.name());
        assertThat(result.submittedAt()).isEqualTo(Instant.parse("2026-09-19T18:00:00Z"));
    }

    @Test
    void rejectsPendingSubmission() {
        UUID connectionId = UUID.randomUUID();
        UUID classroomLinkId = UUID.randomUUID();
        UUID activityLinkId = UUID.randomUUID();

        when(externalSubmissionLinks.findByConnectionIdAndExternalSubmissionId(connectionId, "ms-sub-2"))
                .thenReturn(Optional.empty());
        when(tracking.track(connectionId, classroomLinkId, activityLinkId))
                .thenReturn(new MicrosoftSubmissionTrackingService.TrackingResult(
                        connectionId,
                        classroomLinkId,
                        activityLinkId,
                        UUID.randomUUID(),
                        "Projeto",
                        "assignment-2",
                        List.of(new MicrosoftSubmissionTrackingService.TrackingItem(
                                "ms-sub-2",
                                "ms-user-2",
                                UUID.randomUUID(),
                                UUID.randomUUID(),
                                "João",
                                "working",
                                MicrosoftSubmissionDeliveryStatus.PENDING,
                                null,
                                null,
                                null,
                                null
                        )),
                        0, 1, 0, 0
                ));

        assertThatThrownBy(() -> service.importDelivered(
                connectionId,
                classroomLinkId,
                activityLinkId,
                "ms-sub-2"
        )).isInstanceOf(IllegalStateException.class)
          .hasMessageContaining("DELIVERED");

        verifyNoInteractions(activityLinks, studentLinks, activities, enrollments, submissions, externalLinks);
    }
}
