package br.com.arenadev.draw;

import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="draw_session_settings")
public class DrawSettings {
    @Id
    @Column(name="session_id")
    private UUID sessionId;
    @OneToOne(fetch=FetchType.LAZY, optional=false)
    @MapsId
    @JoinColumn(name="session_id")
    private ClassSession session;
    @Enumerated(EnumType.STRING)
    @Column(name="selection_policy",nullable=false,length=32)
    private DrawPolicy selectionPolicy=DrawPolicy.ROUND_ROBIN_SHUFFLED;
    @Column(name="round_number",nullable=false)
    private int roundNumber=1;
    @Column(nullable=false)
    private long revision=0;
    @Column(name="last_round_request_id")
    private UUID lastRoundRequestId;
    @Column(name="updated_at",nullable=false)
    private Instant updatedAt=Instant.now();

    protected DrawSettings() {}
    public DrawSettings(ClassSession session) { this.session=session; }
    public void changePolicy(DrawPolicy policy) {
        if (policy == null) throw new IllegalArgumentException("Critério de sorteio obrigatório.");
        if (selectionPolicy == policy) return;
        selectionPolicy=policy; roundNumber++; touch();
    }
    public void nextRound(UUID requestId) { roundNumber++; lastRoundRequestId=requestId; touch(); }
    public void touch() { revision++; updatedAt=Instant.now(); }
    public UUID getSessionId() { return sessionId; }
    public DrawPolicy getSelectionPolicy() { return selectionPolicy; }
    public int getRoundNumber() { return roundNumber; }
    public UUID getLastRoundRequestId() { return lastRoundRequestId; }
    public long getRevision() { return revision; }
}
