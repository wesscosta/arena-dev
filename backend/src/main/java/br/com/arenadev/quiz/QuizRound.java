package br.com.arenadev.quiz;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_rounds")
public class QuizRound {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private ActivityQuestion question;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuizStatus status = QuizStatus.READY;

    @Column(name = "opened_at") private Instant openedAt;
    @Column(name = "locked_at") private Instant lockedAt;
    @Column(name = "revealed_at") private Instant revealedAt;
    @Column(name = "closed_at") private Instant closedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    protected QuizRound() {}

    public QuizRound(ClassSession session, ActivityQuestion question) {
        this.session = session;
        this.question = question;
    }

    public void open(Instant now) {
        if (status == QuizStatus.OPEN) return;
        if (status != QuizStatus.READY) throw new IllegalArgumentException("Somente um Quiz preparado pode ser aberto.");
        status = QuizStatus.OPEN;
        openedAt = now;
        updatedAt = now;
    }

    public void lock(Instant now) {
        if (status == QuizStatus.LOCKED) return;
        if (status != QuizStatus.OPEN) throw new IllegalArgumentException("Somente um Quiz aberto pode ser bloqueado.");
        status = QuizStatus.LOCKED;
        lockedAt = now;
        updatedAt = now;
    }

    public void reveal(Instant now) {
        if (status == QuizStatus.REVEALED) return;
        if (status != QuizStatus.LOCKED) throw new IllegalArgumentException("Bloqueie as respostas antes de revelar o Quiz.");
        status = QuizStatus.REVEALED;
        revealedAt = now;
        updatedAt = now;
    }

    public void close(Instant now) {
        if (status == QuizStatus.CLOSED) return;
        status = QuizStatus.CLOSED;
        closedAt = now;
        updatedAt = now;
    }

    public boolean acceptsAnswers() { return status == QuizStatus.OPEN; }
    public boolean resultsVisiblePublicly() { return revealedAt != null; }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public ActivityQuestion getQuestion() { return question; }
    public QuizStatus getStatus() { return status; }
    public Instant getOpenedAt() { return openedAt; }
    public Instant getLockedAt() { return lockedAt; }
    public Instant getRevealedAt() { return revealedAt; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
