package br.com.arenadev.interaction;

import br.com.arenadev.wordcloud.WordCloudRound;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "word_cloud_interaction_shadow_links")
public class WordCloudInteractionShadowLink {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "word_cloud_round_id", nullable = false, unique = true)
    private WordCloudRound wordCloudRound;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interaction_definition_id", nullable = false)
    private InteractionDefinition definition;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interaction_run_id", nullable = false, unique = true)
    private InteractionRun run;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected WordCloudInteractionShadowLink() {
    }

    public WordCloudInteractionShadowLink(
            WordCloudRound wordCloudRound,
            InteractionDefinition definition,
            InteractionRun run
    ) {
        this.wordCloudRound = Objects.requireNonNull(
                wordCloudRound,
                "A rodada legada é obrigatória."
        );
        this.definition = Objects.requireNonNull(
                definition,
                "A definição shadow é obrigatória."
        );
        this.run = Objects.requireNonNull(
                run,
                "A execução shadow é obrigatória."
        );
    }

    public UUID getId() { return id; }
    public WordCloudRound getWordCloudRound() { return wordCloudRound; }
    public InteractionDefinition getDefinition() { return definition; }
    public InteractionRun getRun() { return run; }
    public Instant getCreatedAt() { return createdAt; }
}
