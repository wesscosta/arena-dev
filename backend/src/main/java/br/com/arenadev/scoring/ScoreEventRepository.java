package br.com.arenadev.scoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScoreEventRepository extends JpaRepository<ScoreEvent, UUID> {
    List<ScoreEvent> findByClassroomIdOrderByCreatedAtAsc(UUID classroomId);
    List<ScoreEvent> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    boolean existsByReversalOfId(UUID eventId);
    boolean existsByClassroomId(UUID classroomId);
}
