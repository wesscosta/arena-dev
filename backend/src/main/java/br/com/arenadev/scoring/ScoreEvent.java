package br.com.arenadev.scoring;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.session.ClassSession;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "score_events")
public class ScoreEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private ClassSession session;

    @Column(nullable = false)
    private int points;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ScoreCategory category;

    @Column(nullable = false, length = 300)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ScoreSource source;

    @Column(name = "activity_ref", length = 120)
    private String activityRef;

    @Column(name = "question_ref", length = 120)
    private String questionRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reversal_of")
    private ScoreEvent reversalOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ScoreEvent() {
    }

    public ScoreEvent(
            Classroom classroom,
            Student student,
            ClassSession session,
            int points,
            ScoreCategory category,
            String description,
            ScoreSource source,
            String activityRef,
            String questionRef,
            ScoreEvent reversalOf
    ) {
        this.classroom = classroom;
        this.student = student;
        this.session = session;
        this.points = points;
        this.category = category;
        this.description = description;
        this.source = source;
        this.activityRef = activityRef;
        this.questionRef = questionRef;
        this.reversalOf = reversalOf;
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public Student getStudent() { return student; }
    public ClassSession getSession() { return session; }
    public int getPoints() { return points; }
    public ScoreCategory getCategory() { return category; }
    public String getDescription() { return description; }
    public ScoreSource getSource() { return source; }
    public String getActivityRef() { return activityRef; }
    public String getQuestionRef() { return questionRef; }
    public ScoreEvent getReversalOf() { return reversalOf; }
    public Instant getCreatedAt() { return createdAt; }
}
