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
        this.answerJson = answerJson;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public QuizRound getRound() { return round; }
    public SessionParticipant getParticipant() { return participant; }
    public String getAnswerJson() { return answerJson; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
