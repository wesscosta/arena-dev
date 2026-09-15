
package br.com.arenadev.submission;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submission_assessments")
public class SubmissionAssessment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private ActivitySubmission submission;

    @Column(name = "teacher_notes", columnDefinition = "text")
    private String teacherNotes;

    @Column(name = "feedback_draft", columnDefinition = "text")
    private String feedbackDraft;

    @Column(name = "published_feedback", columnDefinition = "text")
    private String publishedFeedback;

    @Column(name = "feedback_published_at")
    private Instant feedbackPublishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    protected SubmissionAssessment() {}

    public SubmissionAssessment(ActivitySubmission submission) {
        this.submission = submission;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void updateTeacherNotes(String teacherNotes) {
        this.teacherNotes = teacherNotes == null || teacherNotes.isBlank() ? null : teacherNotes.trim();
        this.updatedAt = Instant.now();
    }

    public void updateFeedbackDraft(String feedbackDraft) {
        this.feedbackDraft = feedbackDraft == null || feedbackDraft.isBlank() ? null : feedbackDraft.trim();
        this.updatedAt = Instant.now();
    }

    public void publishFeedback(Instant when) {
        if (feedbackDraft == null || feedbackDraft.isBlank()) {
            throw new IllegalStateException("Escreva ou revise o feedback antes de publicar.");
        }
        this.publishedFeedback = feedbackDraft.trim();
        this.feedbackPublishedAt = when;
        this.updatedAt = when;
    }

    public UUID getId() { return id; }
    public ActivitySubmission getSubmission() { return submission; }
    public String getTeacherNotes() { return teacherNotes; }
    public String getFeedbackDraft() { return feedbackDraft; }
    public String getPublishedFeedback() { return publishedFeedback; }
    public Instant getFeedbackPublishedAt() { return feedbackPublishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
