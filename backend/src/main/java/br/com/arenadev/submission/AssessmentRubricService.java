package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AssessmentRubricService {
    private final ActivityRepository activityRepository;
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final ActivityRubricCriterionRepository rubricRepository;
    private final AssessmentCriterionRepository criterionRepository;

    public AssessmentRubricService(
            ActivityRepository activityRepository,
            ActivitySubmissionRepository submissionRepository,
            SubmissionAssessmentRepository assessmentRepository,
            ActivityRubricCriterionRepository rubricRepository,
            AssessmentCriterionRepository criterionRepository
    ) {
        this.activityRepository = activityRepository;
        this.submissionRepository = submissionRepository;
        this.assessmentRepository = assessmentRepository;
        this.rubricRepository = rubricRepository;
        this.criterionRepository = criterionRepository;
    }

    @Transactional(readOnly = true)
    public RubricView rubric(UUID activityId) {
        requireActivity(activityId);
        return rubricView(activityId);
    }

    @Transactional
    public RubricView replaceRubric(UUID activityId, List<RubricCriterionInput> inputs) {
        Activity activity = requireActivity(activityId);
        if (inputs == null || inputs.isEmpty()) {
            throw new IllegalArgumentException("A rubrica precisa ter ao menos um critério.");
        }

        List<ActivityRubricCriterion> current = rubricRepository
                .findByActivityIdAndActiveTrueOrderByPositionAsc(activityId);
        current.forEach(ActivityRubricCriterion::deactivate);

        for (int i = 0; i < inputs.size(); i++) {
            RubricCriterionInput input = inputs.get(i);
            String title = input.title() == null ? "" : input.title().trim();
            if (title.isBlank()) throw new IllegalArgumentException("Todo critério precisa de um título.");
            BigDecimal maxPoints = input.maxPoints();
            if (maxPoints == null || maxPoints.signum() <= 0) {
                throw new IllegalArgumentException("Todo critério precisa de pontuação máxima maior que zero.");
            }
            rubricRepository.save(new ActivityRubricCriterion(
                    activity, title, input.description(), maxPoints, i
            ));
        }
        return rubricView(activityId);
    }

    @Transactional
    public AssessmentView assessment(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        if (submission.getStatus() == ActivitySubmissionStatus.SUBMITTED) {
            submission.beginReview(Instant.now());
        }
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseGet(() -> assessmentRepository.save(new SubmissionAssessment(submission)));

        List<AssessmentCriterion> criteria = criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId());
        if (criteria.isEmpty()) {
            List<ActivityRubricCriterion> rubric = rubricRepository
                    .findByActivityIdAndActiveTrueOrderByPositionAsc(activityId);
            for (ActivityRubricCriterion criterion : rubric) {
                criterionRepository.save(new AssessmentCriterion(assessment, criterion));
            }
            criteria = criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId());
        }
        return assessmentView(submission, assessment, criteria);
    }

    @Transactional
    public AssessmentView score(
            UUID activityId,
            UUID submissionId,
            UUID criterionId,
            BigDecimal awardedPoints,
            String teacherComment
    ) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        AssessmentCriterion criterion = criterionRepository.findByIdAndAssessmentId(criterionId, assessment.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Critério de avaliação não encontrado."));
        criterion.score(awardedPoints, teacherComment);
        return assessmentView(
                submission,
                assessment,
                criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId())
        );
    }

    @Transactional
    public AssessmentView grade(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        List<AssessmentCriterion> criteria = criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId());
        if (criteria.isEmpty()) {
            throw new IllegalStateException("Defina uma rubrica antes de concluir a correção.");
        }
        if (criteria.stream().anyMatch(item -> item.getAwardedPoints() == null)) {
            throw new IllegalStateException("Pontue todos os critérios antes de concluir a correção.");
        }
        submission.grade(Instant.now());
        return assessmentView(submission, assessment, criteria);
    }

    private Activity requireActivity(UUID activityId) {
        return activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
    }

    private ActivitySubmission requireSubmission(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)) {
            throw new ResourceNotFoundException("Entrega não encontrada para esta atividade.");
        }
        if (submission.getStatus() != ActivitySubmissionStatus.SUBMITTED
                && submission.getStatus() != ActivitySubmissionStatus.UNDER_REVIEW
                && submission.getStatus() != ActivitySubmissionStatus.GRADED
                && submission.getStatus() != ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException("A entrega ainda não está disponível para avaliação.");
        }
        return submission;
    }

    private RubricView rubricView(UUID activityId) {
        List<RubricCriterionView> criteria = rubricRepository
                .findByActivityIdAndActiveTrueOrderByPositionAsc(activityId)
                .stream()
                .map(item -> new RubricCriterionView(
                        item.getId(), item.getTitle(), item.getDescription(), item.getMaxPoints(), item.getPosition()
                ))
                .toList();
        BigDecimal maxPoints = criteria.stream()
                .map(RubricCriterionView::maxPoints)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new RubricView(activityId, maxPoints, criteria);
    }

    private AssessmentView assessmentView(
            ActivitySubmission submission,
            SubmissionAssessment assessment,
            List<AssessmentCriterion> criteria
    ) {
        List<AssessmentCriterionView> views = criteria.stream()
                .map(item -> new AssessmentCriterionView(
                        item.getId(), item.getTitleSnapshot(), item.getDescriptionSnapshot(),
                        item.getMaxPoints(), item.getAwardedPoints(), item.getTeacherComment(), item.getPosition()
                ))
                .toList();
        BigDecimal maxPoints = views.stream()
                .map(AssessmentCriterionView::maxPoints)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal awardedPoints = views.stream()
                .map(AssessmentCriterionView::awardedPoints)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean complete = !views.isEmpty() && views.stream().allMatch(item -> item.awardedPoints() != null);
        return new AssessmentView(
                assessment.getId(), submission.getId(), submission.getStatus(),
                awardedPoints, maxPoints, complete, views
        );
    }

    public record RubricCriterionInput(String title, String description, BigDecimal maxPoints) {}
    public record RubricCriterionView(UUID id, String title, String description, BigDecimal maxPoints, int position) {}
    public record RubricView(UUID activityId, BigDecimal maxPoints, List<RubricCriterionView> criteria) {}
    public record AssessmentCriterionView(
            UUID id, String title, String description, BigDecimal maxPoints,
            BigDecimal awardedPoints, String teacherComment, int position
    ) {}
    public record AssessmentView(
            UUID assessmentId, UUID submissionId, ActivitySubmissionStatus submissionStatus,
            BigDecimal awardedPoints, BigDecimal maxPoints, boolean complete,
            List<AssessmentCriterionView> criteria
    ) {}
}
