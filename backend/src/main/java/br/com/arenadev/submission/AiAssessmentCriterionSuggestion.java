package br.com.arenadev.submission;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "ai_assessment_criterion_suggestions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ai_suggestion_criterion",
                columnNames = {"suggestion_id", "assessment_criterion_id"}
        )
)
public class AiAssessmentCriterionSuggestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "suggestion_id", nullable = false)
    private AiAssessmentSuggestion suggestion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_criterion_id", nullable = false)
    private AssessmentCriterion assessmentCriterion;

    @Column(name = "suggested_points", nullable = false, precision = 8, scale = 2)
    private BigDecimal suggestedPoints;

    @Column(name = "suggested_comment", columnDefinition = "text")
    private String suggestedComment;

    @Column(columnDefinition = "text")
    private String evidence;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AiAssessmentCriterionSuggestion() {}

    public AiAssessmentCriterionSuggestion(
            AiAssessmentSuggestion suggestion,
            AssessmentCriterion assessmentCriterion,
            BigDecimal suggestedPoints,
            String suggestedComment,
            String evidence,
            BigDecimal confidence
    ) {
        this.suggestion = suggestion;
        this.assessmentCriterion = assessmentCriterion;
        this.suggestedPoints = suggestedPoints;
        this.suggestedComment = normalize(suggestedComment);
        this.evidence = normalize(evidence);
        this.confidence = confidence;
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public AiAssessmentSuggestion getSuggestion() { return suggestion; }
    public AssessmentCriterion getAssessmentCriterion() { return assessmentCriterion; }
    public BigDecimal getSuggestedPoints() { return suggestedPoints; }
    public String getSuggestedComment() { return suggestedComment; }
    public String getEvidence() { return evidence; }
    public BigDecimal getConfidence() { return confidence; }
}
