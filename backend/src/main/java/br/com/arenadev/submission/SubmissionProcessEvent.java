package br.com.arenadev.submission;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submission_process_events")
public class SubmissionProcessEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private ActivitySubmission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private SubmissionItem item;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private SubmissionProcessEventType eventType;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SubmissionProcessEvent() {}

    public SubmissionProcessEvent(
            ActivitySubmission submission,
            SubmissionItem item,
            SubmissionProcessEventType eventType,
            String metadataJson,
            Instant occurredAt
    ) {
        this.submission = submission;
        this.item = item;
        this.eventType = eventType;
        this.metadataJson = metadataJson;
        this.occurredAt = occurredAt == null ? Instant.now() : occurredAt;
    }

    public UUID getId() { return id; }
    public ActivitySubmission getSubmission() { return submission; }
    public SubmissionItem getItem() { return item; }
    public SubmissionProcessEventType getEventType() { return eventType; }
    public String getMetadataJson() { return metadataJson; }
    public Instant getOccurredAt() { return occurredAt; }
}
