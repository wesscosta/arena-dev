package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_rubric_criteria")
public class ActivityRubricCriterion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "max_points", nullable = false, precision = 8, scale = 2)
    private BigDecimal maxPoints;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    protected ActivityRubricCriterion() {}

    public ActivityRubricCriterion(Activity activity, String title, String description, BigDecimal maxPoints, int position) {
        this.activity = activity;
        this.title = title.trim();
        this.description = normalize(description);
        this.maxPoints = maxPoints;
        this.position = position;
    }

    public void deactivate() {
        active = false;
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public Activity getActivity() { return activity; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public BigDecimal getMaxPoints() { return maxPoints; }
    public int getPosition() { return position; }
    public boolean isActive() { return active; }
}
