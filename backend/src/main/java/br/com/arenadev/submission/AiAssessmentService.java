package br.com.arenadev.submission;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AiAssessmentService {
    private static final String PROMPT_VERSION = "14.6-v1";

    private final AssessmentRubricService rubricService;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final AssessmentCriterionRepository criterionRepository;
    private final SubmissionItemRepository itemRepository;
    private final ActivityQuestionRepository questionRepository;
    private final AiAssessmentSuggestionRepository suggestionRepository;
    private final AiAssessmentCriterionSuggestionRepository criterionSuggestionRepository;
    private final AssessmentAiProvider provider;
    private final JsonMapper json = JsonMapper.builder().build();

    public AiAssessmentService(
            AssessmentRubricService rubricService,
            SubmissionAssessmentRepository assessmentRepository,
            AssessmentCriterionRepository criterionRepository,
            SubmissionItemRepository itemRepository,
            ActivityQuestionRepository questionRepository,
            AiAssessmentSuggestionRepository suggestionRepository,
            AiAssessmentCriterionSuggestionRepository criterionSuggestionRepository,
            AssessmentAiProvider provider
    ) {
        this.rubricService = rubricService;
        this.assessmentRepository = assessmentRepository;
        this.criterionRepository = criterionRepository;
        this.itemRepository = itemRepository;
        this.questionRepository = questionRepository;
        this.suggestionRepository = suggestionRepository;
        this.criterionSuggestionRepository = criterionSuggestionRepository;
        this.provider = provider;
    }

    @Transactional
    public SuggestionView generate(UUID activityId, UUID submissionId) {
        AssessmentRubricService.AssessmentView structured = rubricService.assessment(activityId, submissionId);
        if (structured.submissionStatus() == ActivitySubmissionStatus.GRADED
                || structured.submissionStatus() == ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException("A correção já foi concluída; reabra o fluxo antes de solicitar nova sugestão.");
        }
        if (structured.criteria().isEmpty()) {
            throw new IllegalStateException("Defina a rubrica antes de solicitar análise por IA.");
        }

        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        List<AssessmentCriterion> criteria = criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId());
        Map<UUID, AssessmentCriterion> criterionById = new LinkedHashMap<>();
        for (AssessmentCriterion criterion : criteria) criterionById.put(criterion.getId(), criterion);

        Map<UUID, ActivityQuestion> questionById = new HashMap<>();
        for (ActivityQuestion question : questionRepository.findByActivityIdOrderByPositionAsc(activityId)) {
            questionById.put(question.getId(), question);
        }

        List<AssessmentAiProvider.EvidenceInput> evidence = itemRepository
                .findBySubmissionIdOrderByPositionAscCreatedAtAsc(submissionId)
                .stream()
                .map(item -> {
                    ActivityQuestion question = item.getQuestion() == null ? null : questionById.get(item.getQuestion().getId());
                    return new AssessmentAiProvider.EvidenceInput(
                            item.getId(),
                            item.getKind().name(),
                            question == null ? null : question.getStatement(),
                            parse(item.getContentJson()),
                            question == null ? null : preferredExpectedAnswer(question),
                            question == null ? null : question.getExplanation()
                    );
                })
                .toList();

        List<AssessmentAiProvider.CriterionInput> rubric = criteria.stream()
                .map(item -> new AssessmentAiProvider.CriterionInput(
                        item.getId(), item.getTitleSnapshot(), item.getDescriptionSnapshot(), item.getMaxPoints()
                ))
                .toList();

        AssessmentAiProvider.Result result = provider.analyze(new AssessmentAiProvider.Request(
                assessment.getSubmission().getActivity().getTitle(),
                rubric,
                evidence
        ));

        validateResult(criteria, result.criteria());

        AiAssessmentSuggestion suggestion = suggestionRepository.save(new AiAssessmentSuggestion(
                assessment,
                result.provider(),
                result.model(),
                PROMPT_VERSION,
                result.summaryFeedback(),
                result.rawResponseJson()
        ));

        for (AssessmentAiProvider.CriterionSuggestion item : result.criteria()) {
            AssessmentCriterion criterion = criterionById.get(item.criterionId());
            criterionSuggestionRepository.save(new AiAssessmentCriterionSuggestion(
                    suggestion,
                    criterion,
                    item.suggestedPoints(),
                    item.suggestedComment(),
                    item.evidence(),
                    normalizeConfidence(item.confidence())
            ));
        }

        return view(suggestion, criteria);
    }

    @Transactional(readOnly = true)
    public Optional<SuggestionView> latest(UUID activityId, UUID submissionId) {
        AssessmentRubricService.AssessmentView structured = rubricService.assessment(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        List<AssessmentCriterion> criteria = criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId());
        return suggestionRepository.findFirstByAssessmentIdOrderByCreatedAtDesc(assessment.getId())
                .map(item -> view(item, criteria));
    }

    @Transactional
    public AssessmentRubricService.AssessmentView apply(UUID activityId, UUID submissionId, UUID suggestionId) {
        AssessmentRubricService.AssessmentView current = rubricService.assessment(activityId, submissionId);
        if (current.submissionStatus() != ActivitySubmissionStatus.UNDER_REVIEW) {
            throw new IllegalStateException("Sugestões de IA só podem ser aplicadas durante a correção do professor.");
        }

        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        AiAssessmentSuggestion suggestion = suggestionRepository.findByIdAndAssessmentId(suggestionId, assessment.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Sugestão de IA não encontrada."));

        Map<UUID, AssessmentCriterion> criteria = new HashMap<>();
        for (AssessmentCriterion criterion : criterionRepository.findByAssessmentIdOrderByPositionAsc(assessment.getId())) {
            criteria.put(criterion.getId(), criterion);
        }

        List<AiAssessmentCriterionSuggestion> suggestions = criterionSuggestionRepository
                .findBySuggestionIdOrderByAssessmentCriterionPositionAsc(suggestionId);
        if (suggestions.isEmpty()) throw new IllegalStateException("A sugestão não possui critérios aplicáveis.");

        for (AiAssessmentCriterionSuggestion item : suggestions) {
            AssessmentCriterion criterion = criteria.get(item.getAssessmentCriterion().getId());
            if (criterion == null) throw new IllegalStateException("Critério da sugestão não pertence à avaliação atual.");
            criterion.applyAiSuggestion(item.getSuggestedPoints(), item.getSuggestedComment(), suggestion);
        }

        return rubricService.assessment(activityId, submissionId);
    }

    private void validateResult(
            List<AssessmentCriterion> criteria,
            List<AssessmentAiProvider.CriterionSuggestion> suggestions
    ) {
        if (suggestions == null || suggestions.size() != criteria.size()) {
            throw new IllegalStateException("A IA deve retornar exatamente uma sugestão para cada critério.");
        }
        Map<UUID, AssessmentCriterion> expected = new HashMap<>();
        for (AssessmentCriterion criterion : criteria) expected.put(criterion.getId(), criterion);
        Set<UUID> seen = new HashSet<>();
        for (AssessmentAiProvider.CriterionSuggestion suggestion : suggestions) {
            AssessmentCriterion criterion = expected.get(suggestion.criterionId());
            if (criterion == null || !seen.add(suggestion.criterionId())) {
                throw new IllegalStateException("A IA retornou um critério inválido ou duplicado.");
            }
            BigDecimal points = suggestion.suggestedPoints();
            if (points == null || points.signum() < 0 || points.compareTo(criterion.getMaxPoints()) > 0) {
                throw new IllegalStateException("A IA retornou pontuação fora dos limites da rubrica.");
            }
        }
    }

    private SuggestionView view(AiAssessmentSuggestion suggestion, List<AssessmentCriterion> criteria) {
        Map<UUID, AssessmentCriterion> criterionById = new HashMap<>();
        for (AssessmentCriterion criterion : criteria) criterionById.put(criterion.getId(), criterion);

        List<CriterionSuggestionView> rows = criterionSuggestionRepository
                .findBySuggestionIdOrderByAssessmentCriterionPositionAsc(suggestion.getId())
                .stream()
                .map(item -> {
                    AssessmentCriterion criterion = criterionById.get(item.getAssessmentCriterion().getId());
                    boolean applied = criterion != null
                            && criterion.getAppliedAiSuggestion() != null
                            && criterion.getAppliedAiSuggestion().getId().equals(suggestion.getId());
                    return new CriterionSuggestionView(
                            item.getAssessmentCriterion().getId(),
                            criterion == null ? "Critério" : criterion.getTitleSnapshot(),
                            item.getSuggestedPoints(),
                            criterion == null ? null : criterion.getMaxPoints(),
                            item.getSuggestedComment(),
                            item.getEvidence(),
                            item.getConfidence(),
                            applied
                    );
                })
                .toList();
        boolean fullyApplied = !rows.isEmpty() && rows.stream().allMatch(CriterionSuggestionView::applied);
        return new SuggestionView(
                suggestion.getId(),
                suggestion.getProvider(),
                suggestion.getModel(),
                suggestion.getPromptVersion(),
                suggestion.getSummaryFeedback(),
                suggestion.getCreatedAt(),
                fullyApplied,
                rows
        );
    }

    private Object preferredExpectedAnswer(ActivityQuestion question) {
        if (question.getExpectedAnswer() != null && !question.getExpectedAnswer().isBlank()) {
            return question.getExpectedAnswer();
        }
        return parse(question.getAnswerJson());
    }

    private Object parse(String value) {
        if (value == null || value.isBlank()) return null;
        try { return json.readValue(value, Object.class); }
        catch (RuntimeException ignored) { return value; }
    }

    private BigDecimal normalizeConfidence(BigDecimal value) {
        if (value == null) return null;
        if (value.signum() < 0) return BigDecimal.ZERO;
        if (value.compareTo(BigDecimal.ONE) > 0) return BigDecimal.ONE;
        return value;
    }

    public record SuggestionView(
            UUID suggestionId,
            String provider,
            String model,
            String promptVersion,
            String summaryFeedback,
            java.time.Instant createdAt,
            boolean fullyApplied,
            List<CriterionSuggestionView> criteria
    ) {}

    public record CriterionSuggestionView(
            UUID criterionId,
            String title,
            BigDecimal suggestedPoints,
            BigDecimal maxPoints,
            String suggestedComment,
            String evidence,
            BigDecimal confidence,
            boolean applied
    ) {}
}
