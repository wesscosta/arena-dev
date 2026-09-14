
package br.com.arenadev.submission;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SubmissionReviewService {
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionItemRepository itemRepository;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final ActivityQuestionRepository questionRepository;
    private final JsonMapper json = JsonMapper.builder().build();

    public SubmissionReviewService(
            ActivitySubmissionRepository submissionRepository,
            SubmissionItemRepository itemRepository,
            SubmissionAssessmentRepository assessmentRepository,
            ActivityQuestionRepository questionRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.itemRepository = itemRepository;
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
    }

    @Transactional
    public ReviewView open(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = getSubmission(activityId, submissionId);
        if (submission.getStatus() == ActivitySubmissionStatus.SUBMITTED) {
            submission.beginReview(Instant.now());
        }
        if (submission.getStatus() != ActivitySubmissionStatus.UNDER_REVIEW
                && submission.getStatus() != ActivitySubmissionStatus.GRADED
                && submission.getStatus() != ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException("A entrega ainda não está disponível para correção.");
        }
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseGet(() -> assessmentRepository.save(new SubmissionAssessment(submission)));
        return view(submission, assessment);
    }

    @Transactional
    public ReviewView saveNotes(UUID activityId, UUID submissionId, String teacherNotes) {
        ActivitySubmission submission = getSubmission(activityId, submissionId);
        if (submission.getStatus() == ActivitySubmissionStatus.SUBMITTED) {
            submission.beginReview(Instant.now());
        }
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseGet(() -> assessmentRepository.save(new SubmissionAssessment(submission)));
        assessment.updateTeacherNotes(teacherNotes);
        return view(submission, assessment);
    }

    private ActivitySubmission getSubmission(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)) {
            throw new ResourceNotFoundException("Entrega não encontrada para esta atividade.");
        }
        return submission;
    }

    private ReviewView view(ActivitySubmission submission, SubmissionAssessment assessment) {
        var enrollment = submission.getEnrollment();
        var student = enrollment.getStudent();
        String displayName = enrollment.getPreferredName() != null && !enrollment.getPreferredName().isBlank()
                ? enrollment.getPreferredName()
                : (student.getNickname() != null && !student.getNickname().isBlank() ? student.getNickname() : student.getName());

        List<ReviewItemView> items = itemRepository.findBySubmissionIdOrderByPositionAscCreatedAtAsc(submission.getId())
                .stream()
                .map(item -> new ReviewItemView(
                        item.getId(),
                        item.getKind(),
                        item.getQuestion() == null ? null : item.getQuestion().getId(),
                        item.getPosition(),
                        parse(item.getContentJson())
                ))
                .toList();

        List<QuestionContextView> questions = questionRepository.findByActivityIdOrderByPositionAsc(submission.getActivity().getId())
                .stream()
                .map(this::questionView)
                .toList();

        return new ReviewView(
                submission.getId(),
                submission.getActivity().getId(),
                submission.getActivity().getTitle(),
                enrollment.getId(),
                student.getId(),
                student.getName(),
                displayName,
                submission.getStatus(),
                submission.getAttemptNumber(),
                submission.getSubmittedAt(),
                items,
                questions,
                assessment.getId(),
                assessment.getTeacherNotes(),
                assessment.getUpdatedAt()
        );
    }

    private QuestionContextView questionView(ActivityQuestion question) {
        return new QuestionContextView(
                question.getId(),
                question.getType().name(),
                question.getStatement(),
                parse(question.getAnswerJson()),
                question.getExplanation(),
                question.getEvaluationCriteriaJson(),
                question.getCode(),
                question.getLanguage()
        );
    }

    private Object parse(String value) {
        if (value == null || value.isBlank()) return null;
        try { return json.readValue(value, Object.class); }
        catch (RuntimeException ignored) { return value; }
    }

    public record ReviewView(
            UUID submissionId,
            UUID activityId,
            String activityTitle,
            UUID enrollmentId,
            UUID studentId,
            String studentName,
            String displayName,
            ActivitySubmissionStatus status,
            int attemptNumber,
            Instant submittedAt,
            List<ReviewItemView> items,
            List<QuestionContextView> questions,
            UUID assessmentId,
            String teacherNotes,
            Instant assessmentUpdatedAt
    ) {}

    public record ReviewItemView(UUID id, SubmissionItemKind kind, UUID questionId, int position, Object content) {}
    public record QuestionContextView(UUID id, String type, String statement, Object expectedAnswer, String explanation, String evaluationCriteriaJson, String code, String language) {}
}
