package br.com.arenadev.interaction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "interaction_evaluations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_interaction_evaluations_response",
                columnNames = "response_id"
        )
)
public class InteractionEvaluation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "response_id", nullable = false)
    private InteractionResponse response;

    @Column(name = "response_revision", nullable = false)
    private int responseRevision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InteractionEvaluationOutcome outcome;

    @Column(precision = 8, scale = 4)
    private BigDecimal score;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluator_type", nullable = false, length = 30)
    private InteractionEvaluatorType evaluatorType;

    @Column(name = "evaluator_version", nullable = false, length = 80)
    private String evaluatorVersion;

    @Column(name = "details_json", nullable = false, columnDefinition = "text")
    private String detailsJson = "{}";

    @Column(name = "evaluated_at", nullable = false, updatable = false)
    private Instant evaluatedAt;

    protected InteractionEvaluation() {
    }

    public InteractionEvaluation(
            InteractionResponse response,
            InteractionEvaluationOutcome outcome,
            BigDecimal score,
            InteractionEvaluatorType evaluatorType,
            String evaluatorVersion,
            String detailsJson,
            Instant evaluatedAt
    ) {
        this.response = Objects.requireNonNull(response, "A resposta avaliada é obrigatória.");
        this.responseRevision = response.getRevision();
        this.outcome = Objects.requireNonNull(outcome, "O resultado da avaliação é obrigatório.");
        this.score = normalizeScore(score);
        this.evaluatorType = Objects.requireNonNull(evaluatorType, "O tipo do evaluator é obrigatório.");
        this.evaluatorVersion = requireText(evaluatorVersion, "A versão do evaluator é obrigatória.");
        this.detailsJson = detailsJson == null || detailsJson.isBlank() ? "{}" : detailsJson.trim();
        this.evaluatedAt = Objects.requireNonNull(evaluatedAt, "O instante da avaliação é obrigatório.");
    }

    private static BigDecimal normalizeScore(BigDecimal score) {
        if (score == null) return null;
        if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("O score da avaliação deve estar entre 0 e 1.");
        }
        return score;
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    public UUID getId() { return id; }
    public InteractionResponse getResponse() { return response; }
    public int getResponseRevision() { return responseRevision; }
    public InteractionEvaluationOutcome getOutcome() { return outcome; }
    public BigDecimal getScore() { return score; }
    public InteractionEvaluatorType getEvaluatorType() { return evaluatorType; }
    public String getEvaluatorVersion() { return evaluatorVersion; }
    public String getDetailsJson() { return detailsJson; }
    public Instant getEvaluatedAt() { return evaluatedAt; }
}
