package br.com.arenadev.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {
    List<ClassSession> findByClassroomIdOrderByStartedAtDesc(UUID classroomId);
}
