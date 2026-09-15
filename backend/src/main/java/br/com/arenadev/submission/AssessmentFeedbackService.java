package br.com.arenadev.submission;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AssessmentFeedbackService {
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final AiAssessmentSuggestionRepository aiSuggestionRepository;

    public AssessmentFeedbackService(
            ActivitySubmissionRepository submissionRepository,
            SubmissionAssessmentRepository assessmentRepository,
            AiAssessmentSuggestionRepository aiSuggestionRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.assessmentRepository = assessmentRepository;
        this.aiSuggestionRepository = aiSuggestionRepository;
    }

    @Transactional(readOnly = true)
    public FeedbackView get(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        return view(submission, assessment);
    }

    @Transactional
    public FeedbackView saveDraft(UUID activityId, UUID submissionId, String feedbackDraft) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        assessment.updateFeedbackDraft(feedbackDraft);
        return view(submission, assessment);
    }

    @Transactional
    public FeedbackView useLatestAiSuggestion(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        AiAssessmentSuggestion suggestion = aiSuggestionRepository
                .findFirstByAssessmentIdOrderByCreatedAtDesc(assessment.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Nenhuma sugestão de IA disponível."));
        if (suggestion.getSummaryFeedback() == null || suggestion.getSummaryFeedback().isBlank()) {
            throw new IllegalStateException("A sugestão de IA não possui feedback textual.");
        }
        assessment.updateFeedbackDraft(suggestion.getSummaryFeedback());
        return view(submission, assessment);
    }

    @Transactional
    public FeedbackView publish(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        if (submission.getStatus() != ActivitySubmissionStatus.GRADED
                && submission.getStatus() != ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException("Conclua a correção antes de publicar o feedback.");
        }
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        assessment.publishFeedback(Instant.now());
        return view(submission, assessment);
    }

    private ActivitySubmission requireSubmission(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)) {
            throw new ResourceNotFoundException("Entrega não encontrada para esta atividade.");
        }
        return submission;
    }

    private FeedbackView view(ActivitySubmission submission, SubmissionAssessment assessment) {
        return new FeedbackView(
                assessment.getId(),
                submission.getId(),
                submission.getStatus(),
                assessment.getFeedbackDraft(),
                assessment.getPublishedFeedback(),
                assessment.getFeedbackPublishedAt()
        );
    }

    public record FeedbackView(
            UUID assessmentId,
            UUID submissionId,
            ActivitySubmissionStatus submissionStatus,
            String feedbackDraft,
            String publishedFeedback,
            Instant publishedAt
    ) {}
}
