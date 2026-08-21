package br.com.arenadev.classroom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "enrollments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_enrollment_classroom_student",
                columnNames = {"classroom_id", "student_id"}
        )
)
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    protected Enrollment() {
    }

    public Enrollment(Classroom classroom, Student student) {
        this.classroom = classroom;
        this.student = student;
    }

    public UUID getId() {
        return id;
    }

    public Classroom getClassroom() {
        return classroom;
    }

    public Student getStudent() {
        return student;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
