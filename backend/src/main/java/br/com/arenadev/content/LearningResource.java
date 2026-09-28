package br.com.arenadev.content;

import br.com.arenadev.classroom.Classroom;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_resources")
public class LearningResource {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(columnDefinition = "text")
    private String body;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LearningResourceFormat format = LearningResourceFormat.MARKDOWN;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private LearningResourceSourceType sourceType = LearningResourceSourceType.MANUAL;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "source_label")
    private String sourceLabel;

    @Column(name = "source_reference", columnDefinition = "text")
    private String sourceReference;

    @Column(name = "source_snapshot_at")
    private Instant sourceSnapshotAt;

    @Column(name = "source_content_sha256", length = 64)
    private String sourceContentSha256;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LearningResource() {}

    public LearningResource(Classroom classroom, String title) {
        this.classroom = classroom;
        this.title = title;
    }
    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel
    ) {
        this.title = title;
        this.summary = summary;
        this.body = body;
        this.format = format;
        this.sourceType = sourceType;
        this.sourceUrl = sourceUrl;
        this.sourceLabel = sourceLabel;
        this.updatedAt = Instant.now();
    }

    public void recordProvenance(String sourceReference, Instant sourceSnapshotAt, String sourceContentSha256) {
        this.sourceReference = sourceReference;
        this.sourceSnapshotAt = sourceSnapshotAt;
        this.sourceContentSha256 = sourceContentSha256;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getBody() { return body; }
    public LearningResourceFormat getFormat() { return format; }
    public LearningResourceSourceType getSourceType() { return sourceType; }
    public String getSourceUrl() { return sourceUrl; }
    public String getSourceLabel() { return sourceLabel; }
    public String getSourceReference() { return sourceReference; }
    public Instant getSourceSnapshotAt() { return sourceSnapshotAt; }
    public String getSourceContentSha256() { return sourceContentSha256; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
