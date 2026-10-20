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

    @Column(name = "anonymized_at")
    private Instant anonymizedAt;

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

    public Instant getAnonymizedAt() {
        return anonymizedAt;
    }

    public boolean isAnonymized() {
        return anonymizedAt != null;
    }

    /** Replaces personal data by a stable pseudonym; the row and its history stay. */
    void anonymize(String pseudonym, Instant at) {
        this.registration = null;
        this.name = pseudonym;
        this.nickname = null;
        this.active = false;
        this.anonymizedAt = at;
    }

    public void update(String registration, String name, String nickname, boolean active) {
        if (anonymizedAt != null) {
            throw new IllegalArgumentException("Aluno anonimizado não pode ser editado.");
        }
        this.registration = registration;
        this.name = name;
        this.nickname = nickname;
        this.active = active;
    }
}
