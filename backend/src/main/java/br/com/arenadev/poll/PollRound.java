package br.com.arenadev.poll;

import br.com.arenadev.session.ClassSession;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "poll_rounds")
public class PollRound {
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
    private PollStatus status = PollStatus.OPEN;

    @Column(name = "live_results", nullable = false)
    private boolean liveResults;

    @Column(name = "revealed_at")
    private Instant revealedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position asc")
    private List<PollOption> options = new ArrayList<>();

    protected PollRound() {
    }

    public PollRound(ClassSession session, String prompt, boolean liveResults) {
        this.session = session;
        this.prompt = prompt;
        this.liveResults = liveResults;
    }

    public void addOption(String label, int position) {
        options.add(new PollOption(this, label, position));
    }

    public void reveal(Instant now) {
        if (status == PollStatus.CLOSED) {
            throw new IllegalArgumentException("A votação já foi encerrada.");
        }
        if (status == PollStatus.REVEALED) return;
        status = PollStatus.REVEALED;
        revealedAt = now;
        updatedAt = now;
    }

    public void close(Instant now) {
        if (status == PollStatus.CLOSED) return;
        status = PollStatus.CLOSED;
        closedAt = now;
        updatedAt = now;
    }

    public boolean acceptsVotes() {
        return status == PollStatus.OPEN || status == PollStatus.REVEALED;
    }

    public boolean resultsVisiblePublicly() {
        return liveResults || status == PollStatus.REVEALED || status == PollStatus.CLOSED;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public String getPrompt() { return prompt; }
    public PollStatus getStatus() { return status; }
    public boolean isLiveResults() { return liveResults; }
    public Instant getRevealedAt() { return revealedAt; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<PollOption> getOptions() { return options; }
}
