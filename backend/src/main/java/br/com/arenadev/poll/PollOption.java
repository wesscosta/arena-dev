package br.com.arenadev.poll;

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

import java.util.UUID;

@Entity
@Table(
        name = "poll_options",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_poll_option_round_position",
                columnNames = {"round_id", "position"}
        )
)
public class PollOption {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private PollRound round;

    @Column(nullable = false, length = 160)
    private String label;

    @Column(nullable = false)
    private int position;

    protected PollOption() {
    }

    PollOption(PollRound round, String label, int position) {
        this.round = round;
        this.label = label;
        this.position = position;
    }

    public UUID getId() { return id; }
    public PollRound getRound() { return round; }
    public String getLabel() { return label; }
    public int getPosition() { return position; }
}
