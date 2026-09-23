package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.*;
import br.com.arenadev.submission.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MicrosoftSubmissionOutcomePublishServiceTest {

    @Test
    void pushesCompletedLocalAssessmentWithoutReturningSubmission() {
        Fixture f = new Fixture();

        when(f.submission.getStatus()).thenReturn(ActivitySubmissionStatus.GRADED);
        when(f.assessment.getPublishedFeedback()).thenReturn(null);
        when(f.assessment.getFeedbackDraft()).thenReturn("Feedback revisado");

        var c1 = mock(AssessmentCriterion.class);
        var c2 = mock(AssessmentCriterion.class);
        when(c1.getAwardedPoints()).thenReturn(new BigDecimal("4.0"));
        when(c2.getAwardedPoints()).thenReturn(new BigDecimal("4.5"));
        when(f.criteria.findByAssessmentIdOrderByPositionAsc(f.assessmentId))
                .thenReturn(List.of(c1, c2));

        when(f.graph.listSubmissionOutcomes(
                "token",
                "class-1",
                "assignment-1",
                "ms-sub-1"
        )).thenReturn(List.of(
                new MicrosoftEducationOutcome(
                        "points-outcome",
                        "#microsoft.graph.educationPointsOutcome",
                        null, null, null, null, OffsetDateTime.now()
                ),
                new MicrosoftEducationOutcome(
                        "feedback-outcome",
                        "#microsoft.graph.educationFeedbackOutcome",
                        null, null, null, null, OffsetDateTime.now()
                )
        ));

        var result = f.service().execute(
                f.connectionId,
                f.classroomLinkId,
                f.activityLinkId,
                "ms-sub-1",
                MicrosoftSubmissionOutcomePublishService.PublishAction.PUSH_ASSESSMENT
        );

        verify(f.graph).updatePointsOutcome(
                "token", "class-1", "assignment-1",
                "ms-sub-1", "points-outcome", new BigDecimal("8.5")
        );
        verify(f.graph).updateFeedbackOutcome(
                "token", "class-1", "assignment-1",
                "ms-sub-1", "feedback-outcome", "Feedback revisado"
        );
        verify(f.graph, never()).returnSubmission(any(), any(), any(), any());

        assertThat(result.pointsSent()).isEqualByComparingTo("8.5");
        assertThat(result.feedbackSent()).isTrue();
        assertThat(result.returnedToStudent()).isFalse();
    }

    @Test
    void returnsSubmissionOnlyThroughExplicitAction() {
        Fixture f = new Fixture();
        when(f.submission.getStatus()).thenReturn(ActivitySubmissionStatus.GRADED);

        var result = f.service().execute(
                f.connectionId,
                f.classroomLinkId,
                f.activityLinkId,
                "ms-sub-1",
                MicrosoftSubmissionOutcomePublishService.PublishAction.RETURN_TO_STUDENT
        );

        verify(f.graph).returnSubmission(
                "token", "class-1", "assignment-1", "ms-sub-1"
        );
        verify(f.graph, never()).updatePointsOutcome(
                any(), any(), any(), any(), any(), any()
        );
        verify(f.graph, never()).updateFeedbackOutcome(
                any(), any(), any(), any(), any(), any()
        );

        assertThat(result.returnedToStudent()).isTrue();
    }

    @Test
    void refusesDraftAssessment() {
        Fixture f = new Fixture();
        when(f.submission.getStatus()).thenReturn(ActivitySubmissionStatus.UNDER_REVIEW);

        assertThatThrownBy(() -> f.service().execute(
                f.connectionId,
                f.classroomLinkId,
                f.activityLinkId,
                "ms-sub-1",
                MicrosoftSubmissionOutcomePublishService.PublishAction.PUSH_ASSESSMENT
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Conclua a correção");
    }

    private static class Fixture {
        final UUID connectionId = UUID.randomUUID();
        final UUID classroomLinkId = UUID.randomUUID();
        final UUID activityLinkId = UUID.randomUUID();
        final UUID submissionId = UUID.randomUUID();
        final UUID assessmentId = UUID.randomUUID();

        final IntegrationConnectionService connections = mock(IntegrationConnectionService.class);
        final ExternalClassroomLinkRepository classroomLinks = mock(ExternalClassroomLinkRepository.class);
        final ExternalActivityLinkRepository activityLinks = mock(ExternalActivityLinkRepository.class);
        final ExternalSubmissionLinkRepository submissionLinks = mock(ExternalSubmissionLinkRepository.class);
        final ActivitySubmissionRepository submissions = mock(ActivitySubmissionRepository.class);
        final SubmissionAssessmentRepository assessments = mock(SubmissionAssessmentRepository.class);
        final AssessmentCriterionRepository criteria = mock(AssessmentCriterionRepository.class);
        final MicrosoftGraphTokenProvider tokenProvider = mock(MicrosoftGraphTokenProvider.class);
        final MicrosoftGraphEducationClient graph = mock(MicrosoftGraphEducationClient.class);

        final ActivitySubmission submission = mock(ActivitySubmission.class);
        final SubmissionAssessment assessment = mock(SubmissionAssessment.class);

        Fixture() {
            var connection = mock(IntegrationConnectionEntity.class);
            when(connection.getProvider()).thenReturn(LearningPlatformProvider.MICROSOFT_TEAMS);
            when(connection.getStatus()).thenReturn(IntegrationConnectionStatus.ACTIVE);
            when(connection.getExternalTenantId()).thenReturn("tenant-1");
            when(connections.required(connectionId)).thenReturn(connection);

            var classroomLink = mock(ExternalClassroomLinkEntity.class);
            when(classroomLink.getConnectionId()).thenReturn(connectionId);
            when(classroomLink.getExternalClassroomId()).thenReturn("class-1");
            when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(classroomLink));

            var activityLink = mock(ExternalActivityLinkEntity.class);
            when(activityLink.getConnectionId()).thenReturn(connectionId);
            when(activityLink.getExternalClassroomLinkId()).thenReturn(classroomLinkId);
            when(activityLink.getExternalActivityId()).thenReturn("assignment-1");
            when(activityLinks.findById(activityLinkId)).thenReturn(Optional.of(activityLink));

            var submissionLink = mock(ExternalSubmissionLinkEntity.class);
            when(submissionLink.getExternalActivityLinkId()).thenReturn(activityLinkId);
            when(submissionLink.getSubmissionId()).thenReturn(submissionId);
            when(submissionLinks.findByConnectionIdAndExternalSubmissionId(
                    connectionId,
                    "ms-sub-1"
            )).thenReturn(Optional.of(submissionLink));

            when(tokenProvider.acquire("tenant-1"))
                    .thenReturn(new MicrosoftGraphAccessToken(
                            "token",
                            OffsetDateTime.now().plusHours(1)
                    ));

            when(submission.getId()).thenReturn(submissionId);
            when(submissions.findById(submissionId)).thenReturn(Optional.of(submission));
            when(assessments.findBySubmissionId(submissionId)).thenReturn(Optional.of(assessment));
            when(assessment.getId()).thenReturn(assessmentId);
        }

        MicrosoftSubmissionOutcomePublishService service() {
            return new MicrosoftSubmissionOutcomePublishService(
                    connections,
                    classroomLinks,
                    activityLinks,
                    submissionLinks,
                    submissions,
                    assessments,
                    criteria,
                    tokenProvider,
                    graph
            );
        }
    }
}
