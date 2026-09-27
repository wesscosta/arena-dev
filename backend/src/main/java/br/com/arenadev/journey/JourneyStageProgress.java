package br.com.arenadev.journey;

import br.com.arenadev.classroom.Enrollment;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "journey_stage_progress", uniqueConstraints = @UniqueConstraint(name = "uk_journey_stage_progress", columnNames = {"journey_stage_id", "enrollment_id"}))
public class JourneyStageProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journey_stage_id", nullable = false)
    private JourneyStage stage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected JourneyStageProgress() {}

    public JourneyStageProgress(JourneyStage stage, Enrollment enrollment) {
        this.stage = stage;
        this.enrollment = enrollment;
    }

    public void start(Instant when) {
        if (startedAt == null) startedAt = when;
        updatedAt = when;
    }

    public void complete(Instant when) {
        if (startedAt == null) startedAt = when;
        if (completedAt == null) completedAt = when;
        updatedAt = when;
    }

    public UUID getId() { return id; }
    public JourneyStage getStage() { return stage; }
    public Enrollment getEnrollment() { return enrollment; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
