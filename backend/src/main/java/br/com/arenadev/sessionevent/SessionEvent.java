package br.com.arenadev.sessionevent;

import br.com.arenadev.session.ClassSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_events")
public class SessionEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Column(name = "sequence_no", nullable = false, insertable = false, updatable = false)
    private Long sequenceNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    private SessionEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private SessionEventActor actor;

    @Column(nullable = false, length = 280)
    private String summary;

    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJson = "{}";

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    protected SessionEvent() {
    }

    public SessionEvent(
            ClassSession session,
            SessionEventType eventType,
            SessionEventActor actor,
            String summary,
            String payloadJson
    ) {
        this.session = session;
        this.eventType = eventType;
        this.actor = actor;
        this.summary = summary;
        this.payloadJson = payloadJson;
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public Long getSequenceNo() { return sequenceNo; }
    public SessionEventType getEventType() { return eventType; }
    public SessionEventActor getActor() { return actor; }
    public String getSummary() { return summary; }
    public String getPayloadJson() { return payloadJson; }
    public Instant getOccurredAt() { return occurredAt; }
}
