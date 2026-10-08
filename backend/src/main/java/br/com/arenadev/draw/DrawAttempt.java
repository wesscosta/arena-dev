package br.com.arenadev.draw;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="draw_attempts")
public class DrawAttempt {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="session_id",nullable=false)
    private ClassSession session;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="student_id",nullable=false)
    private Student student;
    @Column(nullable=false)
    private int sequence;
    @Column(name="round_number",nullable=false)
    private int roundNumber;
    @Enumerated(EnumType.STRING)
    @Column(name="selection_policy",nullable=false,length=32)
    private DrawPolicy selectionPolicy;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false,length=16)
    private DrawOutcome status=DrawOutcome.PENDING;
    @Column(name="select_request_id",nullable=false)
    private UUID selectRequestId;
    @Column(name="resolution_request_id")
    private UUID resolutionRequestId;
    @Column(name="resolution_fingerprint",length=64)
    private String resolutionFingerprint;
    @Column(name="selected_at",nullable=false)
    private Instant selectedAt=Instant.now();
    @Column(name="resolved_at")
    private Instant resolvedAt;

    protected DrawAttempt() {}
    public DrawAttempt(ClassSession session, Student student, int sequence, int roundNumber,
                       DrawPolicy selectionPolicy, UUID requestId) {
        this.session=session; this.student=student; this.sequence=sequence;
        this.roundNumber=roundNumber; this.selectionPolicy=selectionPolicy; this.selectRequestId=requestId;
    }
    public void resolve(UUID requestId, DrawOutcome outcome, String fingerprint) {
        if (status != DrawOutcome.PENDING) throw new IllegalArgumentException("O sorteio já foi resolvido.");
        if (requestId == null || outcome == null || outcome == DrawOutcome.PENDING) {
            throw new IllegalArgumentException("Desfecho do sorteio inválido.");
        }
        status=outcome; resolutionRequestId=requestId; resolutionFingerprint=fingerprint; resolvedAt=Instant.now();
    }
    public UUID getId(){return id;}
    public ClassSession getSession(){return session;}
    public Student getStudent(){return student;}
    public int getSequence(){return sequence;}
    public int getRoundNumber(){return roundNumber;}
    public DrawPolicy getSelectionPolicy(){return selectionPolicy;}
    public DrawOutcome getStatus(){return status;}
    public UUID getSelectRequestId(){return selectRequestId;}
    public UUID getResolutionRequestId(){return resolutionRequestId;}
    public String getResolutionFingerprint(){return resolutionFingerprint;}
    public Instant getSelectedAt(){return selectedAt;}
    public Instant getResolvedAt(){return resolvedAt;}
}
