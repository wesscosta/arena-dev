package br.com.arenadev.study;

import java.util.UUID;

/** Stable study identity. It is intentionally independent from a live ClassSession. */
public record StudyPrincipal(UUID userId, UUID enrollmentId, UUID classroomId, Role role) {
    public enum Role { STUDENT }
}
