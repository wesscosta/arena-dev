package br.com.arenadev.poll;

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
import java.util.UUID;

@Entity
@Table(
        name = "poll_votes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_poll_vote_round_participant",
                columnNames = {"round_id", "participant_id"}
        )
)
public class PollVote {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private PollRound round;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "option_id", nullable = false)
    private PollOption option;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PollVote() {
    }

    public PollVote(PollRound round, SessionParticipant participant, PollOption option) {
        this.round = round;
        this.participant = participant;
        this.option = option;
    }

    public UUID getId() { return id; }
    public PollRound getRound() { return round; }
    public SessionParticipant getParticipant() { return participant; }
    public PollOption getOption() { return option; }
    public Instant getCreatedAt() { return createdAt; }
}
