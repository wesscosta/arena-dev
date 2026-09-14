
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.classroom.Enrollment;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "activity_submissions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_activity_submission_attempt",
                columnNames = {"activity_id", "enrollment_id", "attempt_number"}
        )
)
public class ActivitySubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ActivitySubmissionStatus status = ActivitySubmissionStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private SubmissionSource source = SubmissionSource.ARENA;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber = 1;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    protected ActivitySubmission() {}

    public ActivitySubmission(Activity activity, Enrollment enrollment, int attemptNumber, SubmissionSource source) {
        this.activity = activity;
        this.enrollment = enrollment;
        this.attemptNumber = attemptNumber;
        this.source = source;
    }

    @PreUpdate
    void preUpdate() { this.updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public Activity getActivity() { return activity; }
    public Enrollment getEnrollment() { return enrollment; }
    public ActivitySubmissionStatus getStatus() { return status; }
    public SubmissionSource getSource() { return source; }
    public int getAttemptNumber() { return attemptNumber; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getReturnedAt() { return returnedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
