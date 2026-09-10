package br.com.arenadev.wordcloud;

import br.com.arenadev.session.ClassSession;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "word_cloud_rounds")
public class WordCloudRound {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Column(nullable = false, length = 280)
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WordCloudStatus status = WordCloudStatus.COLLECTING;

    @Column(name = "live_reveal", nullable = false)
    private boolean liveReveal;

    @Column(name = "max_words_per_participant", nullable = false)
    private int maxWordsPerParticipant;

    @Column(name = "revealed_at")
    private Instant revealedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected WordCloudRound() {
    }

    public WordCloudRound(
            ClassSession session,
            String prompt,
            boolean liveReveal,
            int maxWordsPerParticipant
    ) {
        this.session = session;
        this.prompt = prompt;
        this.liveReveal = liveReveal;
        this.maxWordsPerParticipant = maxWordsPerParticipant;
    }

    public void reveal(Instant now) {
        if (status != WordCloudStatus.COLLECTING) {
            throw new IllegalArgumentException("A nuvem não está mais coletando respostas.");
        }
        status = WordCloudStatus.REVEALED;
        revealedAt = now;
        updatedAt = now;
    }

    public void close(Instant now) {
        if (status == WordCloudStatus.CLOSED) return;
        status = WordCloudStatus.CLOSED;
        closedAt = now;
        updatedAt = now;
    }

    public boolean isOpen() {
        return status != WordCloudStatus.CLOSED;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public String getPrompt() { return prompt; }
    public WordCloudStatus getStatus() { return status; }
    public boolean isLiveReveal() { return liveReveal; }
    public int getMaxWordsPerParticipant() { return maxWordsPerParticipant; }
    public Instant getRevealedAt() { return revealedAt; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
