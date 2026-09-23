package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.submission.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class MicrosoftSubmissionOutcomeApplyService {
    private final MicrosoftSubmissionOutcomePreviewService previewService;
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final ActivityRubricCriterionRepository rubricRepository;
    private final AssessmentCriterionRepository criterionRepository;

    public MicrosoftSubmissionOutcomeApplyService(
            MicrosoftSubmissionOutcomePreviewService previewService,
            ActivitySubmissionRepository submissionRepository,
            SubmissionAssessmentRepository assessmentRepository,
            ActivityRubricCriterionRepository rubricRepository,
            AssessmentCriterionRepository criterionRepository
    ) {
        this.previewService = previewService;
        this.submissionRepository = submissionRepository;
        this.assessmentRepository = assessmentRepository;
        this.rubricRepository = rubricRepository;
        this.criterionRepository = criterionRepository;
    }

    @Transactional
    public ApplyResult apply(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            String microsoftSubmissionId,
            ApplyAction action
    ) {
        if (action == null) {
            throw new IllegalArgumentException("action é obrigatória.");
        }

        var preview = previewService.preview(
                connectionId,
                classroomLinkId,
                activityLinkId,
                microsoftSubmissionId
        );

        var submission = submissionRepository.findById(preview.localSubmissionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Entrega Arena vinculada não encontrada."
                ));

        if (submission.getStatus() != ActivitySubmissionStatus.SUBMITTED
                && submission.getStatus() != ActivitySubmissionStatus.UNDER_REVIEW) {
            throw new IllegalStateException(
                    "Somente entregas enviadas ou em correção podem receber dados externos."
            );
        }

        boolean movedToReview = false;
        if (submission.getStatus() == ActivitySubmissionStatus.SUBMITTED) {
            submission.beginReview(Instant.now());
            movedToReview = true;
        }

        var assessment = assessmentRepository.findBySubmissionId(submission.getId())
                .orElseGet(() -> assessmentRepository.save(
                        new SubmissionAssessment(submission)
                ));

        return switch (action) {
            case APPLY_FEEDBACK_DRAFT -> applyFeedback(
                    preview,
                    submission,
                    assessment,
                    movedToReview
            );
            case APPLY_POINTS_SINGLE_CRITERION -> applyPoints(
                    preview,
                    submission,
                    assessment,
                    movedToReview
            );
        };
    }

    private ApplyResult applyFeedback(
            MicrosoftSubmissionOutcomePreviewService.OutcomePreview preview,
            ActivitySubmission submission,
            SubmissionAssessment assessment,
            boolean movedToReview
    ) {
        String externalFeedback = firstText(
                preview.feedback(),
                preview.publishedFeedback()
        );
        if (externalFeedback == null) {
            throw new IllegalStateException(
                    "O Microsoft Teams não possui feedback disponível para copiar."
            );
        }

        String previous = assessment.getFeedbackDraft();
        assessment.updateFeedbackDraft(externalFeedback);

        boolean changed = movedToReview || !Objects.equals(previous, externalFeedback);

        return result(
                preview,
                submission,
                assessment,
                ApplyAction.APPLY_FEEDBACK_DRAFT,
                changed,
                externalFeedback,
                null,
                null
        );
    }

    private ApplyResult applyPoints(
            MicrosoftSubmissionOutcomePreviewService.OutcomePreview preview,
            ActivitySubmission submission,
            SubmissionAssessment assessment,
            boolean movedToReview
    ) {
        BigDecimal externalPoints = preview.points() != null
                ? preview.points()
                : preview.publishedPoints();

        if (externalPoints == null) {
            throw new IllegalStateException(
                    "O Microsoft Teams não possui pontuação disponível para aplicar."
            );
        }

        List<AssessmentCriterion> criteria = criterionRepository
                .findByAssessmentIdOrderByPositionAsc(assessment.getId());

        if (criteria.isEmpty()) {
            var rubric = rubricRepository
                    .findByActivityIdAndActiveTrueOrderByPositionAsc(
                            submission.getActivity().getId()
                    );
            if (rubric.size() != 1) {
                throw incompatibleRubric(rubric.size());
            }
            criterionRepository.save(new AssessmentCriterion(
                    assessment,
                    rubric.getFirst()
            ));
            criteria = criterionRepository
                    .findByAssessmentIdOrderByPositionAsc(assessment.getId());
        }

        if (criteria.size() != 1) {
            throw incompatibleRubric(criteria.size());
        }

        var criterion = criteria.getFirst();
        BigDecimal previous = criterion.getAwardedPoints();

        if (externalPoints.signum() < 0
                || externalPoints.compareTo(criterion.getMaxPoints()) > 0) {
            throw new IllegalStateException(
                    "A pontuação do Teams (" + externalPoints
                            + ") não cabe no critério local, cujo máximo é "
                            + criterion.getMaxPoints() + "."
            );
        }

        criterion.score(externalPoints, criterion.getTeacherComment());

        boolean changed = movedToReview
                || previous == null
                || previous.compareTo(externalPoints) != 0;

        return result(
                preview,
                submission,
                assessment,
                ApplyAction.APPLY_POINTS_SINGLE_CRITERION,
                changed,
                assessment.getFeedbackDraft(),
                externalPoints,
                criterion.getMaxPoints()
        );
    }

    private static IllegalStateException incompatibleRubric(int count) {
        if (count == 0) {
            return new IllegalStateException(
                    "Defina uma rubrica local com um único critério antes de aplicar a pontuação do Teams."
            );
        }
        return new IllegalStateException(
                "A avaliação local possui " + count
                        + " critérios. O Arena não distribui automaticamente uma nota agregada do Teams entre vários critérios."
        );
    }

    private static String firstText(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary.trim();
        if (fallback != null && !fallback.isBlank()) return fallback.trim();
        return null;
    }

    private static ApplyResult result(
            MicrosoftSubmissionOutcomePreviewService.OutcomePreview preview,
            ActivitySubmission submission,
            SubmissionAssessment assessment,
            ApplyAction action,
            boolean changed,
            String feedbackDraft,
            BigDecimal awardedPoints,
            BigDecimal maxPoints
    ) {
        return new ApplyResult(
                preview.localSubmissionId(),
                assessment.getId(),
                preview.microsoftSubmissionId(),
                action,
                submission.getStatus(),
                feedbackDraft,
                awardedPoints,
                maxPoints,
                changed
        );
    }

    public enum ApplyAction {
        APPLY_FEEDBACK_DRAFT,
        APPLY_POINTS_SINGLE_CRITERION
    }

    public record ApplyResult(
            UUID localSubmissionId,
            UUID assessmentId,
            String microsoftSubmissionId,
            ApplyAction action,
            ActivitySubmissionStatus submissionStatus,
            String feedbackDraft,
            BigDecimal awardedPoints,
            BigDecimal maxPoints,
            boolean changed
    ) {}
}
