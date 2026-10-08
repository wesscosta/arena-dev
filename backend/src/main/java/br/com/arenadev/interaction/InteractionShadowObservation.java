package br.com.arenadev.interaction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "interaction_shadow_observations")
public class InteractionShadowObservation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "interaction_type", nullable = false, length = 30)
    private InteractionShadowType interactionType;

    @Column(name = "legacy_round_id", nullable = false)
    private UUID legacyRoundId;

    @Column(name = "interaction_run_id")
    private UUID interactionRunId;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_status", length = 20)
    private InteractionRunStatus runStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InteractionShadowObservationStatus status;

    @Column(name = "mismatches_json", nullable = false, columnDefinition = "text")
    private String mismatchesJson = "[]";

    @Column(name = "legacy_response_count")
    private Long legacyResponseCount;

    @Column(name = "observed_at", nullable = false, updatable = false)
    private Instant observedAt = Instant.now();

    protected InteractionShadowObservation() {
    }

    public InteractionShadowObservation(
            InteractionShadowType interactionType,
            UUID legacyRoundId,
            UUID interactionRunId,
            InteractionRunStatus runStatus,
            InteractionShadowObservationStatus status,
            String mismatchesJson,
            Long legacyResponseCount,
            Instant observedAt
    ) {
        this.interactionType = Objects.requireNonNull(interactionType, "O tipo do shadow é obrigatório.");
        this.legacyRoundId = Objects.requireNonNull(legacyRoundId, "A rodada legada é obrigatória.");
        this.interactionRunId = interactionRunId;
        this.runStatus = runStatus;
        this.status = Objects.requireNonNull(status, "O status da observação é obrigatório.");
        this.mismatchesJson = mismatchesJson == null || mismatchesJson.isBlank()
                ? "[]"
                : mismatchesJson.trim();
        if (legacyResponseCount != null && legacyResponseCount < 0) {
            throw new IllegalArgumentException("A contagem de respostas não pode ser negativa.");
        }
        this.legacyResponseCount = legacyResponseCount;
        this.observedAt = Objects.requireNonNull(observedAt, "O instante observado é obrigatório.");
    }

    public boolean terminal() {
        return runStatus == InteractionRunStatus.CLOSED;
    }

    public UUID getId() { return id; }
    public InteractionShadowType getInteractionType() { return interactionType; }
    public UUID getLegacyRoundId() { return legacyRoundId; }
    public UUID getInteractionRunId() { return interactionRunId; }
    public InteractionRunStatus getRunStatus() { return runStatus; }
    public InteractionShadowObservationStatus getStatus() { return status; }
    public String getMismatchesJson() { return mismatchesJson; }
    public Long getLegacyResponseCount() { return legacyResponseCount; }
    public Instant getObservedAt() { return observedAt; }
}
