package br.com.arenadev.achievement;

import br.com.arenadev.classroom.Student;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_achievements", uniqueConstraints = @UniqueConstraint(
        name = "uk_student_achievement_code", columnNames = {"student_id", "achievement_code"}))
public class StudentAchievement {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "achievement_code", nullable = false, length = 50)
    private AchievementCode code;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 40)
    private AchievementSourceType sourceType;

    @Column(name = "source_id")
    private UUID sourceId;

    @Column(name = "unlocked_at", nullable = false)
    private Instant unlockedAt;

    protected StudentAchievement() {}

    public StudentAchievement(Student student, AchievementCode code, AchievementSourceType sourceType, UUID sourceId, Instant unlockedAt) {
        this.student = student;
        this.code = code;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.unlockedAt = unlockedAt;
    }

    public AchievementCode getCode() { return code; }
    public AchievementSourceType getSourceType() { return sourceType; }
    public UUID getSourceId() { return sourceId; }
    public Instant getUnlockedAt() { return unlockedAt; }
}
