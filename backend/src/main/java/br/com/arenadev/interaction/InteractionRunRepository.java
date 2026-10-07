package br.com.arenadev.interaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InteractionRunRepository extends JpaRepository<InteractionRun, UUID> {
    Optional<InteractionRun> findFirstBySessionIdAndStatus(
            UUID sessionId,
            InteractionRunStatus status
    );

    Optional<InteractionRun> findFirstBySessionIdAndStatusAndDefinitionProducesEvidenceTrueOrderBySequenceDesc(
            UUID sessionId,
            InteractionRunStatus status
    );

    Optional<InteractionRun> findFirstBySessionIdAndDefinitionProducesEvidenceTrueOrderBySequenceDesc(
            UUID sessionId
    );

    Optional<InteractionRun> findFirstBySessionIdOrderBySequenceDesc(UUID sessionId);

    List<InteractionRun> findBySessionIdOrderBySequenceAsc(UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select run
            from InteractionRun run
            join fetch run.session
            join fetch run.definition
            where run.id = :id
            """)
    Optional<InteractionRun> findByIdForUpdate(@Param("id") UUID id);
}
