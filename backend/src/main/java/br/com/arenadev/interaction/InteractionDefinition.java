package br.com.arenadev.interaction;

import br.com.arenadev.learning.ContentRef;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "interaction_definitions")
public class InteractionDefinition {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "text")
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_kind", nullable = false, length = 20)
    private InteractionResponseKind responseKind;

    @Column(name = "response_config_json", nullable = false, columnDefinition = "text")
    private String responseConfigJson = "{}";

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_mode", nullable = false, length = 30)
    private InteractionEvaluationMode evaluationMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_policy", nullable = false, length = 30)
    private InteractionSubmissionPolicy submissionPolicy = InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE;

    @Column(name = "evaluation_config_json", nullable = false, columnDefinition = "text")
    private String evaluationConfigJson = "{}";

    @Enumerated(EnumType.STRING)
    @Column(name = "presentation_mode", nullable = false, length = 30)
    private InteractionPresentationMode presentationMode = InteractionPresentationMode.DEFAULT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_target_id")
    private LearningTarget learningTarget;

    @Column(name = "produces_evidence", nullable = false)
    private boolean producesEvidence;

    @Column(name = "content_source_type", length = 80)
    private String contentSourceType;

    @Column(name = "content_source_id", length = 255)
    private String contentSourceId;

    @Column(name = "content_source_version")
    private Integer contentSourceVersion;

    @Column(name = "content_anchor", columnDefinition = "text")
    private String contentAnchor;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InteractionDefinitionStatus status = InteractionDefinitionStatus.DRAFT;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "definition", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position asc")
    private List<InteractionOption> options = new ArrayList<>();

    protected InteractionDefinition() {
    }

    public InteractionDefinition(
            String prompt,
            InteractionResponseKind responseKind,
            InteractionEvaluationMode evaluationMode,
            InteractionPresentationMode presentationMode,
            LearningTarget learningTarget,
            boolean producesEvidence,
            ContentRef contentRef,
            Provenance provenance
    ) {
        this.prompt = requirePrompt(prompt);
        this.responseKind = Objects.requireNonNull(responseKind, "O tipo de resposta é obrigatório.");
        this.evaluationMode = Objects.requireNonNull(evaluationMode, "O modo de avaliação é obrigatório.");
        this.presentationMode = Objects.requireNonNull(presentationMode, "O modo de apresentação é obrigatório.");
        validatePresentation(responseKind, presentationMode);
        validateEvidenceContract(learningTarget, producesEvidence, evaluationMode);
        this.learningTarget = learningTarget;
        this.producesEvidence = producesEvidence;
        applyContentRef(contentRef);
        applyProvenance(Objects.requireNonNull(provenance, "A proveniência é obrigatória."));
    }

    public void configureResponse(String responseConfigJson) {
        this.responseConfigJson = normalizeJson(responseConfigJson);
        touch();
    }

    public void configureEvaluation(String evaluationConfigJson) {
        this.evaluationConfigJson = normalizeJson(evaluationConfigJson);
        touch();
    }

    public void configureSubmissionPolicy(InteractionSubmissionPolicy submissionPolicy) {
        this.submissionPolicy = Objects.requireNonNull(
                submissionPolicy,
                "A política de submissão é obrigatória."
        );
        touch();
    }

    public void addOption(String optionKey, String label, int position, String metadataJson) {
        if (responseKind != InteractionResponseKind.CHOICE) {
            throw new IllegalArgumentException("Somente interações CHOICE podem possuir alternativas.");
        }
        String normalizedKey = requireText(optionKey, "A chave da alternativa é obrigatória.");
        if (options.stream().anyMatch(option -> option.getOptionKey().equals(normalizedKey))) {
            throw new IllegalArgumentException("A chave da alternativa deve ser única na interação.");
        }
        if (options.stream().anyMatch(option -> option.getPosition() == position)) {
            throw new IllegalArgumentException("A posição da alternativa deve ser única na interação.");
        }
        options.add(new InteractionOption(this, normalizedKey, label, position, metadataJson));
        touch();
    }

    public void activate() {
        if (responseKind == InteractionResponseKind.CHOICE && options.isEmpty()) {
            throw new IllegalArgumentException("Uma interação CHOICE precisa de alternativas antes de ser ativada.");
        }
        status = InteractionDefinitionStatus.ACTIVE;
        touch();
    }

    public void archive() {
        status = InteractionDefinitionStatus.ARCHIVED;
        touch();
    }

    public void relinkLearningTarget(LearningTarget target, boolean producesEvidence) {
        validateEvidenceContract(target, producesEvidence, evaluationMode);
        this.learningTarget = target;
        this.producesEvidence = producesEvidence;
        touch();
    }

    @PreUpdate
    void preUpdate() {
        touch();
    }

    private void applyContentRef(ContentRef ref) {
        if (ref == null) return;
        contentSourceType = ref.sourceType();
        contentSourceId = ref.sourceId();
        contentSourceVersion = ref.sourceVersion();
        contentAnchor = ref.anchor();
    }

    private void applyProvenance(Provenance provenance) {
        provenanceOrigin = provenance.origin();
        provenanceSourceRef = provenance.sourceRef();
        provenanceCreatedBy = provenance.createdBy();
        provenanceReviewedBy = provenance.reviewedBy();
        provenanceCreatedAt = provenance.createdAt();
    }

    private static void validateEvidenceContract(
            LearningTarget learningTarget,
            boolean producesEvidence,
            InteractionEvaluationMode evaluationMode
    ) {
        if (!producesEvidence) return;
        if (learningTarget == null) {
            throw new IllegalArgumentException(
                    "Uma interação que produz evidência precisa de LearningTarget."
            );
        }
        if (evaluationMode == InteractionEvaluationMode.NONE) {
            throw new IllegalArgumentException(
                    "Uma interação sem avaliação não pode produzir LearningEvidence nesta versão."
            );
        }
    }

    private static void validatePresentation(
            InteractionResponseKind responseKind,
            InteractionPresentationMode presentationMode
    ) {
        if (presentationMode == InteractionPresentationMode.WORD_CLOUD
                && responseKind != InteractionResponseKind.TEXT) {
            throw new IllegalArgumentException("WORD_CLOUD exige resposta do tipo TEXT.");
        }
    }

    private static String requirePrompt(String value) {
        return requireText(value, "O enunciado da interação é obrigatório.");
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    private static String normalizeJson(String value) {
        return value == null || value.isBlank() ? "{}" : value.trim();
    }

    private void touch() {
        updatedAt = Instant.now();
    }

    public ContentRef contentRef() {
        if (contentSourceType == null || contentSourceId == null) return null;
        return new ContentRef(contentSourceType, contentSourceId, contentSourceVersion, contentAnchor);
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
    public String getPrompt() { return prompt; }
    public InteractionResponseKind getResponseKind() { return responseKind; }
    public String getResponseConfigJson() { return responseConfigJson; }
    public InteractionEvaluationMode getEvaluationMode() { return evaluationMode; }
    public InteractionSubmissionPolicy getSubmissionPolicy() { return submissionPolicy; }
    public String getEvaluationConfigJson() { return evaluationConfigJson; }
    public InteractionPresentationMode getPresentationMode() { return presentationMode; }
    public LearningTarget getLearningTarget() { return learningTarget; }
    public boolean isProducesEvidence() { return producesEvidence; }
    public InteractionDefinitionStatus getStatus() { return status; }
    public int getSchemaVersion() { return schemaVersion; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<InteractionOption> getOptions() { return Collections.unmodifiableList(options); }
}
