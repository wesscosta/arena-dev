package br.com.arenadev.realtime;

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
        name = "buzzer_presses",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_buzzer_press_round_participant", columnNames = {"round_id", "participant_id"}),
                @UniqueConstraint(name = "uk_buzzer_press_round_position", columnNames = {"round_id", "position"})
        }
)
public class BuzzerPress {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private BuzzerRound round;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private SessionParticipant participant;

    @Column(nullable = false)
    private int position;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt = Instant.now();

    protected BuzzerPress() {
    }

    public BuzzerPress(BuzzerRound round, SessionParticipant participant, int position) {
        this.round = round;
        this.participant = participant;
        this.position = position;
    }

    public UUID getId() { return id; }
    public BuzzerRound getRound() { return round; }
    public SessionParticipant getParticipant() { return participant; }
    public int getPosition() { return position; }
    public Instant getReceivedAt() { return receivedAt; }
}
