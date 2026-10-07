package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InteractionRunRepository extends JpaRepository<InteractionRun, UUID> {
    Optional<InteractionRun> findFirstBySessionIdAndStatus(
            UUID sessionId,
            InteractionRunStatus status
    );

    Optional<InteractionRun> findFirstBySessionIdOrderBySequenceDesc(UUID sessionId);

    List<InteractionRun> findBySessionIdOrderBySequenceAsc(UUID sessionId);
}
