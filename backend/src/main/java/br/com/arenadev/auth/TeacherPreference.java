package br.com.arenadev.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "teacher_preferences")
public class TeacherPreference {
    @Id
    @Column(name = "username", nullable = false, length = 120)
    private String username;

    @Column(name = "session_timeout_minutes", nullable = false)
    private int sessionTimeoutMinutes;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TeacherPreference() {
    }

    TeacherPreference(String username, int sessionTimeoutMinutes) {
        this.username = username;
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
        this.updatedAt = Instant.now();
    }

    void updateSessionTimeout(int minutes) {
        this.sessionTimeoutMinutes = minutes;
        this.updatedAt = Instant.now();
    }

    public int getSessionTimeoutMinutes() {
        return sessionTimeoutMinutes;
    }
}
