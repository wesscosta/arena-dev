package br.com.arenadev.submission;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "assessment_criteria",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_assessment_criterion_position",
                columnNames = {"assessment_id", "position"}
        )
)
public class AssessmentCriterion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id", nullable = false)
    private SubmissionAssessment assessment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubric_criterion_id")
    private ActivityRubricCriterion rubricCriterion;

    @Column(name = "title_snapshot", nullable = false, length = 160)
    private String titleSnapshot;

    @Column(name = "description_snapshot", columnDefinition = "text")
    private String descriptionSnapshot;

    @Column(name = "max_points", nullable = false, precision = 8, scale = 2)
    private BigDecimal maxPoints;

    @Column(name = "awarded_points", precision = 8, scale = 2)
    private BigDecimal awardedPoints;

    @Column(name = "teacher_comment", columnDefinition = "text")
    private String teacherComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_ai_suggestion_id")
    private AiAssessmentSuggestion appliedAiSuggestion;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    protected AssessmentCriterion() {}

    public AssessmentCriterion(SubmissionAssessment assessment, ActivityRubricCriterion rubricCriterion) {
        this.assessment = assessment;
        this.rubricCriterion = rubricCriterion;
        this.titleSnapshot = rubricCriterion.getTitle();
        this.descriptionSnapshot = rubricCriterion.getDescription();
        this.maxPoints = rubricCriterion.getMaxPoints();
        this.position = rubricCriterion.getPosition();
    }

    public void score(BigDecimal awardedPoints, String teacherComment) {
        validatePoints(awardedPoints);
        this.awardedPoints = awardedPoints;
        this.teacherComment = normalize(teacherComment);
        this.appliedAiSuggestion = null;
        this.updatedAt = Instant.now();
    }

    public void applyAiSuggestion(BigDecimal awardedPoints, String teacherComment, AiAssessmentSuggestion suggestion) {
        validatePoints(awardedPoints);
        this.awardedPoints = awardedPoints;
        this.teacherComment = normalize(teacherComment);
        this.appliedAiSuggestion = suggestion;
        this.updatedAt = Instant.now();
    }

    private void validatePoints(BigDecimal awardedPoints) {
        if (awardedPoints == null) throw new IllegalArgumentException("Informe a pontuação do critério.");
        if (awardedPoints.signum() < 0 || awardedPoints.compareTo(maxPoints) > 0) {
            throw new IllegalArgumentException("Pontuação deve ficar entre 0 e o máximo do critério.");
        }
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public SubmissionAssessment getAssessment() { return assessment; }
    public String getTitleSnapshot() { return titleSnapshot; }
    public String getDescriptionSnapshot() { return descriptionSnapshot; }
    public BigDecimal getMaxPoints() { return maxPoints; }
    public BigDecimal getAwardedPoints() { return awardedPoints; }
    public String getTeacherComment() { return teacherComment; }
    public AiAssessmentSuggestion getAppliedAiSuggestion() { return appliedAiSuggestion; }
    public int getPosition() { return position; }
}
