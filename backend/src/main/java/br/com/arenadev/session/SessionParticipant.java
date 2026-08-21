package br.com.arenadev.session;

import br.com.arenadev.classroom.Student;
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
        name = "session_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_session_participant",
                columnNames = {"session_id", "student_id"}
        )
)
public class SessionParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private boolean present;

    @Column(nullable = false)
    private boolean connected;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    @Column(name = "access_token_hash", unique = true, length = 64)
    private String accessTokenHash;

    protected SessionParticipant() {
    }

    public SessionParticipant(ClassSession session, Student student, boolean present) {
        this.session = session;
        this.student = student;
        this.present = present;
    }

    public UUID getId() {
        return id;
    }

    public ClassSession getSession() {
        return session;
    }

    public Student getStudent() {
        return student;
    }

    public boolean isPresent() {
        return present;
    }

    public boolean isConnected() {
        return connected;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public Instant getLeftAt() {
        return leftAt;
    }

    public String getAccessTokenHash() {
        return accessTokenHash;
    }

    public void issueAccessToken(String accessTokenHash) {
        this.accessTokenHash = accessTokenHash;
    }

    public void releaseDevice() {
        this.accessTokenHash = null;
        this.connected = false;
        this.leftAt = Instant.now();
    }

    public void markConnected() {
        this.connected = true;
        this.joinedAt = Instant.now();
        this.leftAt = null;
    }

    public void markDisconnected() {
        this.connected = false;
        this.leftAt = Instant.now();
    }

    public void setPresent(boolean present) {
        this.present = present;
    }
}
