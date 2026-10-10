package br.com.arenadev.scoring;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;

import java.util.List;
import java.util.UUID;

public interface ScoreEventRepository extends JpaRepository<ScoreEvent, UUID> {
    List<ScoreEvent> findByClassroomIdOrderByCreatedAtAsc(UUID classroomId);
    List<ScoreEvent> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    boolean existsByReversalOfId(UUID eventId);
    Optional<ScoreEvent> findByReversalOfId(UUID originalId);
    Optional<ScoreEvent> findByCreateRequestId(UUID requestId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ScoreEvent e where e.id = :id")
    Optional<ScoreEvent> findByIdForUpdate(UUID id);
    boolean existsByClassroomId(UUID classroomId);
}
