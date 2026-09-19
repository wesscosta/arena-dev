package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftSubmissionTrackingServiceTest {

    @Test
    void tracksDeliveredPendingAndUnmatchedSubmissions() {
        var connections = mock(IntegrationConnectionService.class);
        var classroomLinks = mock(ExternalClassroomLinkRepository.class);
        var activityLinks = mock(ExternalActivityLinkRepository.class);
        var studentLinks = mock(ExternalStudentLinkRepository.class);
        var activities = mock(ActivityRepository.class);
        var enrollments = mock(EnrollmentRepository.class);
        var tokens = mock(MicrosoftGraphTokenProvider.class);
        var graph = mock(MicrosoftGraphEducationClient.class);

        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var activityLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();
        var activityId = UUID.randomUUID();
        var enrollmentId = UUID.randomUUID();
        var studentLinkId = UUID.randomUUID();

        when(connections.required(connectionId)).thenReturn(
                new IntegrationConnectionEntity(
                        connectionId,
                        LearningPlatformProvider.MICROSOFT_TEAMS,
                        "Senac",
                        "tenant-01",
                        MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                        IntegrationConnectionStatus.ACTIVE,
                        Instant.parse("2026-09-19T18:00:00Z")
                )
        );

        when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(
                new ExternalClassroomLinkEntity(
                        classroomLinkId,
                        connectionId,
                        classroomId,
                        "class-1",
                        null,
                        Instant.parse("2026-09-19T18:00:00Z")
                )
        ));

        when(activityLinks.findById(activityLinkId)).thenReturn(Optional.of(
                new ExternalActivityLinkEntity(
                        activityLinkId,
                        connectionId,
                        classroomLinkId,
                        activityId,
                        "assignment-1",
                        null,
                        Instant.parse("2026-09-19T18:00:00Z")
                )
        ));

        var activity = mock(Activity.class);
        when(activity.getId()).thenReturn(activityId);
        when(activity.getTitle()).thenReturn("Projeto API");
        when(activities.findById(activityId)).thenReturn(Optional.of(activity));

        var linkedStudent = new ExternalStudentLinkEntity(
                studentLinkId,
                connectionId,
                classroomLinkId,
                enrollmentId,
                "user-1",
                Instant.parse("2026-09-19T18:00:00Z")
        );
        when(studentLinks.findByConnectionIdAndExternalClassroomLinkId(
                connectionId, classroomLinkId
        )).thenReturn(List.of(linkedStudent));

        var enrollment = mock(Enrollment.class);
        var student = mock(Student.class);
        when(enrollment.getStudent()).thenReturn(student);
        when(student.getName()).thenReturn("Maria");
        when(enrollments.findById(enrollmentId)).thenReturn(Optional.of(enrollment));

        when(tokens.acquire("tenant-01")).thenReturn(
                new MicrosoftGraphAccessToken(
                        "token",
                        OffsetDateTime.parse("2026-09-19T20:00:00Z")
                )
        );

        when(graph.listAssignmentSubmissions(
                "token", "class-1", "assignment-1"
        )).thenReturn(List.of(
                new MicrosoftEducationSubmission(
                        "submission-1",
                        "assignment-1",
                        "user-1",
                        "submitted",
                        OffsetDateTime.parse("2026-09-19T17:00:00Z"),
                        null,
                        null,
                        "https://teams.microsoft.com/submission-1"
                ),
                new MicrosoftEducationSubmission(
                        "submission-2",
                        "assignment-1",
                        "user-2",
                        "working",
                        null,
                        null,
                        null,
                        null
                )
        ));

        var service = new MicrosoftSubmissionTrackingService(
                connections,
                classroomLinks,
                activityLinks,
                studentLinks,
                activities,
                enrollments,
                tokens,
                graph
        );

        var result = service.track(
                connectionId,
                classroomLinkId,
                activityLinkId
        );

        assertThat(result.activityTitle()).isEqualTo("Projeto API");
        assertThat(result.delivered()).isEqualTo(1);
        assertThat(result.unmatched()).isEqualTo(1);
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().getFirst().studentName()).isEqualTo("Maria");
    }
}
