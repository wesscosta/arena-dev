package br.com.arenadev.submission;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_assessment_suggestions")
public class AiAssessmentSuggestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id", nullable = false)
    private SubmissionAssessment assessment;

    @Column(nullable = false, length = 40)
    private String provider;

    @Column(nullable = false, length = 120)
    private String model;

    @Column(name = "prompt_version", nullable = false, length = 40)
    private String promptVersion;

    @Column(name = "summary_feedback", columnDefinition = "text")
    private String summaryFeedback;

    @Column(name = "raw_response_json", columnDefinition = "text")
    private String rawResponseJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AiAssessmentSuggestion() {}

    public AiAssessmentSuggestion(
            SubmissionAssessment assessment,
            String provider,
            String model,
            String promptVersion,
            String summaryFeedback,
            String rawResponseJson
    ) {
        this.assessment = assessment;
        this.provider = provider;
        this.model = model;
        this.promptVersion = promptVersion;
        this.summaryFeedback = normalize(summaryFeedback);
        this.rawResponseJson = rawResponseJson;
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public SubmissionAssessment getAssessment() { return assessment; }
    public String getProvider() { return provider; }
    public String getModel() { return model; }
    public String getPromptVersion() { return promptVersion; }
    public String getSummaryFeedback() { return summaryFeedback; }
    public String getRawResponseJson() { return rawResponseJson; }
    public Instant getCreatedAt() { return createdAt; }
}
