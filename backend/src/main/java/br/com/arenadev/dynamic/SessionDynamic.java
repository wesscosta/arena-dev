package br.com.arenadev.dynamic;

import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_dynamics", uniqueConstraints = @UniqueConstraint(name = "uk_session_dynamic_type", columnNames = {"session_id", "type"}))
public class SessionDynamic {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DynamicType type;

    @Column(name = "state_json", nullable = false, columnDefinition = "text")
    private String stateJson = "{}";

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    protected SessionDynamic() {}

    public SessionDynamic(ClassSession session, DynamicType type) {
        this.session = session;
        this.type = type;
    }

    public void updateState(String stateJson) {
        this.stateJson = stateJson;
        this.updatedAt = Instant.now();
        this.endedAt = null;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public DynamicType getType() { return type; }
    public String getStateJson() { return stateJson; }
}
