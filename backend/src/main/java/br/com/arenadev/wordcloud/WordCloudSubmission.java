package br.com.arenadev.wordcloud;

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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "word_cloud_submissions")
public class WordCloudSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private WordCloudRound round;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @Column(name = "raw_text", nullable = false, length = 60)
    private String rawText;

    @Column(name = "normalized_text", nullable = false, length = 60)
    private String normalizedText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected WordCloudSubmission() {
    }

    public WordCloudSubmission(
            WordCloudRound round,
            SessionParticipant participant,
            String rawText,
            String normalizedText
    ) {
        this.round = round;
        this.participant = participant;
        this.rawText = rawText;
        this.normalizedText = normalizedText;
    }

    public UUID getId() { return id; }
    public WordCloudRound getRound() { return round; }
    public SessionParticipant getParticipant() { return participant; }
    public String getRawText() { return rawText; }
    public String getNormalizedText() { return normalizedText; }
    public Instant getCreatedAt() { return createdAt; }
}
