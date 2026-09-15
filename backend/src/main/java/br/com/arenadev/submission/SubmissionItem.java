package br.com.arenadev.submission;

import br.com.arenadev.activity.ActivityQuestion;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submission_items")
public class SubmissionItem {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private ActivitySubmission submission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SubmissionItemKind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private ActivityQuestion question;

    @Column(nullable = false)
    private int position;

    @Column(name = "content_json", nullable = false, columnDefinition = "text")
    private String contentJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    protected SubmissionItem() {}

    public SubmissionItem(
            UUID id,
            ActivitySubmission submission,
            SubmissionItemKind kind,
            ActivityQuestion question,
            int position,
            String contentJson
    ) {
        this.id = id;
        this.submission = submission;
        this.kind = kind;
        this.question = question;
        this.position = position;
        this.contentJson = contentJson;
    }

    public void update(
            SubmissionItemKind kind,
            ActivityQuestion question,
            int position,
            String contentJson
    ) {
        this.kind = kind;
        this.question = question;
        this.position = position;
        this.contentJson = contentJson;
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public ActivitySubmission getSubmission() { return submission; }
    public SubmissionItemKind getKind() { return kind; }
    public ActivityQuestion getQuestion() { return question; }
    public int getPosition() { return position; }
    public String getContentJson() { return contentJson; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
