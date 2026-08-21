package br.com.arenadev.classroom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, length = 60)
    private String registration;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(length = 80)
    private String nickname;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Student() {
    }

    public Student(String registration, String name, String nickname) {
        this.registration = registration;
        this.name = name;
        this.nickname = nickname;
    }

    public UUID getId() {
        return id;
    }

    public String getRegistration() {
        return registration;
    }

    public String getName() {
        return name;
    }

    public String getNickname() {
        return nickname;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void update(String registration, String name, String nickname, boolean active) {
        this.registration = registration;
        this.name = name;
        this.nickname = nickname;
        this.active = active;
    }
}
