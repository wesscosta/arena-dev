package br.com.arenadev.learning;

import br.com.arenadev.interaction.InteractionEvaluation;
import br.com.arenadev.session.SessionParticipant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "learning_evidence",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_learning_evidence_evaluation",
                columnNames = "evaluation_id"
        )
)
public class LearningEvidence {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_target_id", nullable = false)
    private LearningTarget learningTarget;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private InteractionEvaluation evaluation;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private LearningEvidenceSourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LearningEvidenceOutcome outcome;

    @Column(precision = 8, scale = 4)
    private BigDecimal score;

    @Column(precision = 8, scale = 4)
    private BigDecimal confidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "provenance_origin", nullable = false, length = 30)
    private ProvenanceOrigin provenanceOrigin;

    @Column(name = "provenance_source_ref", columnDefinition = "text")
    private String provenanceSourceRef;

    @Column(name = "provenance_created_by")
    private UUID provenanceCreatedBy;

    @Column(name = "provenance_reviewed_by")
    private UUID provenanceReviewedBy;

    @Column(name = "provenance_created_at", nullable = false)
    private Instant provenanceCreatedAt;

    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LearningEvidence() {
    }

    public LearningEvidence(
            SessionParticipant participant,
            LearningTarget learningTarget,
            InteractionEvaluation evaluation,
            LearningEvidenceSourceType sourceType,
            UUID sourceId,
            LearningEvidenceOutcome outcome,
            BigDecimal score,
            BigDecimal confidence,
            Provenance provenance,
            Instant observedAt
    ) {
        this.participant = Objects.requireNonNull(participant, "O participante da evidência é obrigatório.");
        this.learningTarget = Objects.requireNonNull(learningTarget, "O objetivo de aprendizagem é obrigatório.");
        this.evaluation = Objects.requireNonNull(evaluation, "A avaliação de origem é obrigatória.");
        this.sourceType = Objects.requireNonNull(sourceType, "O tipo da fonte é obrigatório.");
        this.sourceId = Objects.requireNonNull(sourceId, "O identificador da fonte é obrigatório.");
        this.outcome = Objects.requireNonNull(outcome, "O resultado observado é obrigatório.");
        this.score = normalizeProbability(score, "score");
        this.confidence = normalizeProbability(confidence, "confidence");
        applyProvenance(Objects.requireNonNull(provenance, "A proveniência é obrigatória."));
        this.observedAt = Objects.requireNonNull(observedAt, "O instante observado é obrigatório.");
    }

    private void applyProvenance(Provenance provenance) {
        provenanceOrigin = provenance.origin();
        provenanceSourceRef = provenance.sourceRef();
        provenanceCreatedBy = provenance.createdBy();
        provenanceReviewedBy = provenance.reviewedBy();
        provenanceCreatedAt = provenance.createdAt();
    }

    private static BigDecimal normalizeProbability(BigDecimal value, String field) {
        if (value == null) return null;
        if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(field + " deve estar entre 0 e 1.");
        }
        return value;
    }

    public Provenance provenance() {
        return new Provenance(
                provenanceOrigin,
                provenanceSourceRef,
                provenanceCreatedBy,
                provenanceReviewedBy,
                provenanceCreatedAt
        );
    }

    public UUID getId() { return id; }
    public SessionParticipant getParticipant() { return participant; }
    public LearningTarget getLearningTarget() { return learningTarget; }
    public InteractionEvaluation getEvaluation() { return evaluation; }
    public LearningEvidenceSourceType getSourceType() { return sourceType; }
    public UUID getSourceId() { return sourceId; }
    public LearningEvidenceOutcome getOutcome() { return outcome; }
    public BigDecimal getScore() { return score; }
    public BigDecimal getConfidence() { return confidence; }
    public Instant getObservedAt() { return observedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
