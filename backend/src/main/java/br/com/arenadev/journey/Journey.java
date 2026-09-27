package br.com.arenadev.journey;

import br.com.arenadev.classroom.Classroom;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "journeys")
public class Journey {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JourneyStatus status = JourneyStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "journey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<JourneyStage> stages = new ArrayList<>();

    @OneToMany(mappedBy = "journey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<JourneySection> sections = new ArrayList<>();

    protected Journey() {}

    public Journey(Classroom classroom, String title) {
        this.classroom = classroom;
        this.title = title;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void update(String title, String description) {
        this.title = title;
        this.description = description;
        this.updatedAt = Instant.now();
    }

    public void publish() {
        if (stages.isEmpty()) throw new IllegalStateException("A jornada precisa ter ao menos uma etapa antes de ser publicada.");
        status = JourneyStatus.PUBLISHED;
        updatedAt = Instant.now();
    }

    public void archive() {
        status = JourneyStatus.ARCHIVED;
        updatedAt = Instant.now();
    }

    public void addStage(JourneyStage stage) {
        stage.attachTo(this);
        stages.add(stage);
    }

    public void removeStage(JourneyStage stage) { stages.remove(stage); }

    public void addSection(JourneySection section) {
        section.attachTo(this);
        sections.add(section);
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public JourneyStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<JourneyStage> getStages() { return stages; }
    public List<JourneySection> getSections() { return sections; }
}
