package br.com.arenadev.draw;

import br.com.arenadev.scoring.ScoreEvent;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name="draw_attempt_score_links")
public class DrawAttemptScoreLink {
    @Id @Column(name="draw_attempt_id") private UUID id;
    @OneToOne(fetch=FetchType.LAZY,optional=false)
    @MapsId @JoinColumn(name="draw_attempt_id") private DrawAttempt attempt;
    @OneToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="score_event_id",nullable=false,unique=true) private ScoreEvent score;
    protected DrawAttemptScoreLink() {}
    public DrawAttemptScoreLink(DrawAttempt attempt, ScoreEvent score) { this.attempt=attempt; this.score=score; }
    public UUID getScoreEventId() { return score.getId(); }
}
