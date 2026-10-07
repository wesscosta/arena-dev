package br.com.arenadev.interaction;

import br.com.arenadev.session.SessionParticipant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "interaction_responses",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_interaction_responses_run_participant",
                columnNames = {"interaction_run_id", "participant_id"}
        )
)
public class InteractionResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interaction_run_id", nullable = false)
    private InteractionRun run;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @Column(name = "response_json", nullable = false, columnDefinition = "text")
    private String responseJson;

    @Column(nullable = false)
    private int revision = 1;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected InteractionResponse() {
    }

    public InteractionResponse(
            InteractionRun run,
            SessionParticipant participant,
            String responseJson,
            Instant submittedAt
    ) {
        this.run = Objects.requireNonNull(run, "A execução da interação é obrigatória.");
        this.participant = Objects.requireNonNull(participant, "O participante é obrigatório.");
        this.responseJson = requirePayload(responseJson);
        this.submittedAt = Objects.requireNonNull(submittedAt, "O instante da resposta é obrigatório.");
        this.updatedAt = submittedAt;
    }

    public boolean samePayload(String candidateJson) {
        return responseJson.equals(requirePayload(candidateJson));
    }

    public void updatePayload(String responseJson, Instant now) {
        this.responseJson = requirePayload(responseJson);
        this.updatedAt = Objects.requireNonNull(now, "O instante da atualização é obrigatório.");
        this.revision += 1;
    }

    private static String requirePayload(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("A resposta bruta é obrigatória.");
        }
        return value.trim();
    }

    public UUID getId() { return id; }
    public InteractionRun getRun() { return run; }
    public SessionParticipant getParticipant() { return participant; }
    public String getResponseJson() { return responseJson; }
    public int getRevision() { return revision; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
