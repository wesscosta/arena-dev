package br.com.arenadev.journey;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.content.LearningResource;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "journey_stages")
public class JourneyStage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id")
    private Activity activity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private JourneySection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_resource_id")
    private LearningResource learningResource;

    @Column(name = "resource_snapshot_body", columnDefinition = "text")
    private String resourceSnapshotBody;

    @Column(name = "resource_snapshot_format", length = 30)
    private String resourceSnapshotFormat;

    @Column(name = "resource_snapshot_source_url", columnDefinition = "text")
    private String resourceSnapshotSourceUrl;

    @Column(name = "resource_snapshot_source_label")
    private String resourceSnapshotSourceLabel;

    @Column(name = "resource_snapshot_revision")
    private Integer resourceSnapshotRevision;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 30)
    private JourneyItemType itemType = JourneyItemType.CONTENT;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "unlock_rule", nullable = false, length = 40)
    private JourneyUnlockRule unlockRule = JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED;

    @Enumerated(EnumType.STRING)
    @Column(name = "completion_rule", nullable = false, length = 40)
    private JourneyCompletionRule completionRule = JourneyCompletionRule.MANUAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected JourneyStage() {}

    public JourneyStage(String title, int position) {
        this.title = title;
        this.position = position;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    void attachTo(Journey journey) { this.journey = journey; }

    public void update(String title, String description, int position, Activity activity, JourneyUnlockRule unlockRule, JourneyCompletionRule completionRule) {
        updateConfiguration(title, description, position, activity, unlockRule, completionRule, section, itemType);
    }

    public void updateConfiguration(
            String title,
            String description,
            int position,
            Activity activity,
            JourneyUnlockRule unlockRule,
            JourneyCompletionRule completionRule,
            JourneySection section,
            JourneyItemType itemType
    ) {
        this.title = title;
        this.description = description;
        this.position = position;
        this.activity = activity;
        this.unlockRule = unlockRule;
        this.completionRule = completionRule;
        this.section = section;
        this.itemType = itemType == null ? (activity == null ? JourneyItemType.CONTENT : JourneyItemType.ACTIVITY) : itemType;
        this.updatedAt = Instant.now();
    }

    /**
     * Explicitly materializes a LearningResource revision into this Journey stage.
     * Normal stage/Journey updates must never call this method for the same association.
     */
    public void materializeResource(LearningResource resource) {
        this.learningResource = resource;
        if (resource == null) {
            clearResourceSnapshot();
            return;
        }
        resourceSnapshotBody = resource.getBody();
        resourceSnapshotFormat = resource.getFormat().name();
        resourceSnapshotSourceUrl = resource.getSourceUrl();
        resourceSnapshotSourceLabel = resource.getSourceLabel();
        resourceSnapshotRevision = resource.getRevision();
        this.updatedAt = Instant.now();
    }

    public void detachLearningResource() {
        this.learningResource = null;
        clearResourceSnapshot();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Journey getJourney() { return journey; }
    public Activity getActivity() { return activity; }
    public JourneySection getSection() { return section; }
    public LearningResource getLearningResource() { return learningResource; }
    public String getResourceSnapshotBody() { return resourceSnapshotBody; }
    public String getResourceSnapshotFormat() { return resourceSnapshotFormat; }
    public String getResourceSnapshotSourceUrl() { return resourceSnapshotSourceUrl; }
    public String getResourceSnapshotSourceLabel() { return resourceSnapshotSourceLabel; }
    public Integer getResourceSnapshotRevision() { return resourceSnapshotRevision; }

    private void clearResourceSnapshot() {
        resourceSnapshotBody = null;
        resourceSnapshotFormat = null;
        resourceSnapshotSourceUrl = null;
        resourceSnapshotSourceLabel = null;
        resourceSnapshotRevision = null;
    }
    public JourneyItemType getItemType() { return itemType; }
    public int getPosition() { return position; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public JourneyUnlockRule getUnlockRule() { return unlockRule; }
    public JourneyCompletionRule getCompletionRule() { return completionRule; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
