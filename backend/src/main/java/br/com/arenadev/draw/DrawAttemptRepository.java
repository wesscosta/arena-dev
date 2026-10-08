package br.com.arenadev.draw;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DrawAttemptRepository extends JpaRepository<DrawAttempt,UUID> {
    List<DrawAttempt> findBySessionIdOrderBySequenceAsc(UUID sessionId);
    Optional<DrawAttempt> findBySessionIdAndSelectRequestId(UUID sessionId, UUID requestId);
    Optional<DrawAttempt> findBySessionIdAndStatus(UUID sessionId, DrawOutcome status);
    Optional<DrawAttempt> findFirstBySessionIdOrderBySequenceDesc(UUID sessionId);
    Optional<DrawAttempt> findByIdAndSessionId(UUID id, UUID sessionId);
}
