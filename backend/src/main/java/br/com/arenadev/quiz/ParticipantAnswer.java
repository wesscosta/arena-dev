package br.com.arenadev.quiz;

import br.com.arenadev.session.SessionParticipant;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "quiz_participant_answers",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_quiz_answer_round_participant",
                columnNames = {"round_id", "participant_id"}
        )
)
public class ParticipantAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private QuizRound round;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @Column(name = "answer_json", nullable = false, columnDefinition = "text")
    private String answerJson;

    @Column(name = "evaluated_at")
    private Instant evaluatedAt;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "score_event_id")
    private UUID scoreEventId;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ParticipantAnswer() {}

    public ParticipantAnswer(QuizRound round, SessionParticipant participant, String answerJson) {
        this.round = round;
        this.participant = participant;
        this.answerJson = answerJson;
    }

    public void updateAnswer(String answerJson, Instant now) {
        if (evaluatedAt != null) {
            throw new IllegalStateException("Uma resposta já avaliada não pode ser alterada.");
        }
        this.answerJson = answerJson;
        this.updatedAt = now;
    }

    public void evaluate(boolean correct, UUID scoreEventId, Instant now) {
        if (evaluatedAt != null) return;
        if (!correct && scoreEventId != null) {
            throw new IllegalArgumentException("Resposta incorreta não pode possuir ScoreEvent de acerto.");
        }
        this.correct = correct;
        this.scoreEventId = scoreEventId;
        this.evaluatedAt = now;
        this.updatedAt = now;
    }

    public boolean isEvaluated() { return evaluatedAt != null; }
    public UUID getId() { return id; }
    public QuizRound getRound() { return round; }
    public SessionParticipant getParticipant() { return participant; }
    public String getAnswerJson() { return answerJson; }
    public Instant getEvaluatedAt() { return evaluatedAt; }
    public Boolean isCorrect() { return correct; }
    public UUID getScoreEventId() { return scoreEventId; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
