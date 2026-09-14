
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

    public UUID getId() { return id; }
    public ActivitySubmission getSubmission() { return submission; }
    public String getTeacherNotes() { return teacherNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
