package br.com.arenadev.timer;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionTimerRepository extends JpaRepository<SessionTimer, UUID> {
    List<SessionTimer> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    Optional<SessionTimer> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select timer
            from SessionTimer timer
            where timer.id = :id
            """)
    Optional<SessionTimer> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select timer
            from SessionTimer timer
            where timer.session.id = :sessionId
              and timer.status in :statuses
            order by timer.createdAt desc
            """)
    List<SessionTimer> findOpenBySessionIdForUpdate(
            @Param("sessionId") UUID sessionId,
            @Param("statuses") Collection<TimerStatus> statuses
    );
}
