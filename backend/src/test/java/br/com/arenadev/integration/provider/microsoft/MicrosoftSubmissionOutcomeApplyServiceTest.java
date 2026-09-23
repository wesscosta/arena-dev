package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.submission.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MicrosoftSubmissionOutcomeApplyServiceTest {

    @Test
    void copiesExternalFeedbackOnlyToLocalDraft() {
        UUID submissionId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();

        var previewService = mock(MicrosoftSubmissionOutcomePreviewService.class);
        var submissions = mock(ActivitySubmissionRepository.class);
        var assessments = mock(SubmissionAssessmentRepository.class);
        var rubrics = mock(ActivityRubricCriterionRepository.class);
        var criteria = mock(AssessmentCriterionRepository.class);

        var submission = mock(ActivitySubmission.class);
        when(submission.getId()).thenReturn(submissionId);
        when(submission.getStatus()).thenReturn(ActivitySubmissionStatus.UNDER_REVIEW);

        var assessment = mock(SubmissionAssessment.class);
        when(assessment.getId()).thenReturn(assessmentId);
        when(assessment.getFeedbackDraft()).thenReturn("Rascunho antigo");

        var preview = new MicrosoftSubmissionOutcomePreviewService.OutcomePreview(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                submissionId,
                "ms-sub-1",
                new BigDecimal("8.5"),
                new BigDecimal("8"),
                "Feedback atual do Teams",
                "Feedback publicado",
                null,
                false
        );

        when(previewService.preview(any(), any(), any(), eq("ms-sub-1")))
                .thenReturn(preview);
        when(submissions.findById(submissionId)).thenReturn(Optional.of(submission));
        when(assessments.findBySubmissionId(submissionId)).thenReturn(Optional.of(assessment));

        var service = new MicrosoftSubmissionOutcomeApplyService(
                previewService,
                submissions,
                assessments,
                rubrics,
                criteria
        );

        var result = service.apply(
                preview.connectionId(),
                preview.classroomLinkId(),
                preview.activityLinkId(),
                "ms-sub-1",
                MicrosoftSubmissionOutcomeApplyService.ApplyAction.APPLY_FEEDBACK_DRAFT
        );

        verify(assessment).updateFeedbackDraft("Feedback atual do Teams");
        verifyNoInteractions(rubrics, criteria);
        verify(submission, never()).grade(any());
        assertThat(result.feedbackDraft()).isEqualTo("Feedback atual do Teams");
        assertThat(result.action()).isEqualTo(
                MicrosoftSubmissionOutcomeApplyService.ApplyAction.APPLY_FEEDBACK_DRAFT
        );
        assertThat(result.changed()).isTrue();
    }

    @Test
    void appliesAggregatePointsOnlyWhenAssessmentHasOneCriterion() {
        UUID submissionId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();

        var previewService = mock(MicrosoftSubmissionOutcomePreviewService.class);
        var submissions = mock(ActivitySubmissionRepository.class);
        var assessments = mock(SubmissionAssessmentRepository.class);
        var rubrics = mock(ActivityRubricCriterionRepository.class);
        var criteria = mock(AssessmentCriterionRepository.class);

        var activity = mock(Activity.class);
        when(activity.getId()).thenReturn(activityId);

        var submission = mock(ActivitySubmission.class);
        when(submission.getId()).thenReturn(submissionId);
        when(submission.getActivity()).thenReturn(activity);
        when(submission.getStatus()).thenReturn(ActivitySubmissionStatus.UNDER_REVIEW);

        var assessment = mock(SubmissionAssessment.class);
        when(assessment.getId()).thenReturn(assessmentId);

        var criterion = mock(AssessmentCriterion.class);
        when(criterion.getMaxPoints()).thenReturn(new BigDecimal("10"));
        when(criterion.getAwardedPoints()).thenReturn(new BigDecimal("7"));
        when(criterion.getTeacherComment()).thenReturn("Comentário local");

        var preview = new MicrosoftSubmissionOutcomePreviewService.OutcomePreview(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                submissionId,
                "ms-sub-2",
                new BigDecimal("8.5"),
                new BigDecimal("8"),
                null,
                null,
                null,
                false
        );

        when(previewService.preview(any(), any(), any(), eq("ms-sub-2")))
                .thenReturn(preview);
        when(submissions.findById(submissionId)).thenReturn(Optional.of(submission));
        when(assessments.findBySubmissionId(submissionId)).thenReturn(Optional.of(assessment));
        when(criteria.findByAssessmentIdOrderByPositionAsc(assessmentId))
                .thenReturn(List.of(criterion));

        var service = new MicrosoftSubmissionOutcomeApplyService(
                previewService,
                submissions,
                assessments,
                rubrics,
                criteria
        );

        var result = service.apply(
                preview.connectionId(),
                preview.classroomLinkId(),
                preview.activityLinkId(),
                "ms-sub-2",
                MicrosoftSubmissionOutcomeApplyService.ApplyAction.APPLY_POINTS_SINGLE_CRITERION
        );

        verify(criterion).score(new BigDecimal("8.5"), "Comentário local");
        verify(submission, never()).grade(any());
        assertThat(result.awardedPoints()).isEqualByComparingTo("8.5");
        assertThat(result.maxPoints()).isEqualByComparingTo("10");
        assertThat(result.changed()).isTrue();
    }

    @Test
    void refusesToDistributeAggregatePointsAcrossMultipleCriteria() {
        UUID submissionId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();

        var previewService = mock(MicrosoftSubmissionOutcomePreviewService.class);
        var submissions = mock(ActivitySubmissionRepository.class);
        var assessments = mock(SubmissionAssessmentRepository.class);
        var rubrics = mock(ActivityRubricCriterionRepository.class);
        var criteria = mock(AssessmentCriterionRepository.class);

        var submission = mock(ActivitySubmission.class);
        when(submission.getId()).thenReturn(submissionId);
        when(submission.getStatus()).thenReturn(ActivitySubmissionStatus.UNDER_REVIEW);

        var assessment = mock(SubmissionAssessment.class);
        when(assessment.getId()).thenReturn(assessmentId);

        var preview = new MicrosoftSubmissionOutcomePreviewService.OutcomePreview(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                submissionId,
                "ms-sub-3",
                new BigDecimal("8"),
                null,
                null,
                null,
                null,
                false
        );

        when(previewService.preview(any(), any(), any(), eq("ms-sub-3")))
                .thenReturn(preview);
        when(submissions.findById(submissionId)).thenReturn(Optional.of(submission));
        when(assessments.findBySubmissionId(submissionId)).thenReturn(Optional.of(assessment));
        when(criteria.findByAssessmentIdOrderByPositionAsc(assessmentId))
                .thenReturn(List.of(
                        mock(AssessmentCriterion.class),
                        mock(AssessmentCriterion.class)
                ));

        var service = new MicrosoftSubmissionOutcomeApplyService(
                previewService,
                submissions,
                assessments,
                rubrics,
                criteria
        );

        assertThatThrownBy(() -> service.apply(
                preview.connectionId(),
                preview.classroomLinkId(),
                preview.activityLinkId(),
                "ms-sub-3",
                MicrosoftSubmissionOutcomeApplyService.ApplyAction.APPLY_POINTS_SINGLE_CRITERION
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("não distribui automaticamente");
    }
}
