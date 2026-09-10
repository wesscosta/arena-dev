package br.com.arenadev.activity;

import br.com.arenadev.classroom.Classroom;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "activities")
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 180)
    private String topic;

    @Column(nullable = false)
    private int points;

    @Column(name = "on_time_bonus", nullable = false)
    private int onTimeBonus;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_kind", nullable = false, length = 20)
    private ActivityResourceKind resourceKind = ActivityResourceKind.INTERNAL;

    @Column(name = "resource_platform", length = 120)
    private String resourcePlatform;

    @Column(name = "resource_url", length = 1000)
    private String resourceUrl;

    @Column(name = "copied_from_activity_id")
    private UUID copiedFromActivityId;

    @Column(name = "copied_from_classroom_id")
    private UUID copiedFromClassroomId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ActivityQuestion> questions = new ArrayList<>();

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ActivityStep> steps = new ArrayList<>();

    protected Activity() {}

    public Activity(Classroom classroom, String title) {
        this.classroom = classroom;
        this.title = title;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public void update(
            String title,
            String topic,
            int points,
            int onTimeBonus,
            ActivityResourceKind resourceKind,
            String resourcePlatform,
            String resourceUrl
    ) {
        this.title = title;
        this.topic = topic;
        this.points = points;
        this.onTimeBonus = onTimeBonus;
        this.resourceKind = resourceKind;
        this.resourcePlatform = resourcePlatform;
        this.resourceUrl = resourceUrl;
        this.updatedAt = Instant.now();
    }

    public void markCopiedFrom(Activity source) {
        this.copiedFromActivityId = source.getId();
        this.copiedFromClassroomId = source.getClassroom().getId();
    }

    public void addQuestion(ActivityQuestion question) {
        question.attachTo(this);
        this.questions.add(question);
    }

    public void removeQuestion(ActivityQuestion question) {
        this.steps.removeIf(step -> step.referencesQuestion(question));
        this.questions.remove(question);
    }

    public void addStep(ActivityStep step) {
        step.attachTo(this);
        this.steps.add(step);
    }

    public void removeStep(ActivityStep step) {
        this.steps.remove(step);
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public String getTitle() { return title; }
    public String getTopic() { return topic; }
    public int getPoints() { return points; }
    public int getOnTimeBonus() { return onTimeBonus; }
    public ActivityResourceKind getResourceKind() { return resourceKind; }
    public String getResourcePlatform() { return resourcePlatform; }
    public String getResourceUrl() { return resourceUrl; }
    public UUID getCopiedFromActivityId() { return copiedFromActivityId; }
    public UUID getCopiedFromClassroomId() { return copiedFromClassroomId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<ActivityQuestion> getQuestions() { return questions; }
    public List<ActivityStep> getSteps() { return steps; }
}
