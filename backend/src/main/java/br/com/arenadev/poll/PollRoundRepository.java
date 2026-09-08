package br.com.arenadev.poll;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface PollRoundRepository extends JpaRepository<PollRound, UUID> {
    @Query("""
            select distinct round
            from PollRound round
            left join fetch round.options
            where round.session.id = :sessionId
            order by round.createdAt desc
            """)
    List<PollRound> findBySessionIdWithOptions(@Param("sessionId") UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select round
            from PollRound round
            where round.id = :id
            """)
    Optional<PollRound> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select round
            from PollRound round
            where round.session.id = :sessionId
              and round.status in :statuses
            order by round.createdAt desc
            """)
    List<PollRound> findOpenBySessionIdForUpdate(
            @Param("sessionId") UUID sessionId,
            @Param("statuses") Set<PollStatus> statuses
    );
}
