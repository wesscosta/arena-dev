package br.com.arenadev.learning;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "learning_targets")
public class LearningTarget {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 180)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LearningTargetType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private LearningTarget parent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LearningTargetStatus status = LearningTargetStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LearningTarget() {
    }

    public LearningTarget(String title, LearningTargetType type, LearningTarget parent) {
        this.title = requireTitle(title);
        this.type = Objects.requireNonNull(type, "O tipo do objetivo de aprendizagem é obrigatório.");
        changeParent(parent);
    }

    public void rename(String title) {
        this.title = requireTitle(title);
        this.updatedAt = Instant.now();
    }

    public void changeParent(LearningTarget parent) {
        if (parent == this || (id != null && parent != null && id.equals(parent.id))) {
            throw new IllegalArgumentException("Um objetivo de aprendizagem não pode ser pai de si mesmo.");
        }
        this.parent = parent;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        this.status = LearningTargetStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public void activate() {
        this.status = LearningTargetStatus.ACTIVE;
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    private static String requireTitle(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("O título do objetivo de aprendizagem é obrigatório.");
        }
        String normalized = value.trim();
        if (normalized.length() > 180) {
            throw new IllegalArgumentException("O título do objetivo de aprendizagem deve ter até 180 caracteres.");
        }
        return normalized;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public LearningTargetType getType() { return type; }
    public LearningTarget getParent() { return parent; }
    public LearningTargetStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
