package br.com.arenadev.quiz;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface QuizRoundRepository extends JpaRepository<QuizRound, UUID> {
    @Query("""
            select round
            from QuizRound round
            where round.session.id = :sessionId
            order by round.createdAt desc
            """)
    List<QuizRound> findBySessionIdOrderByCreatedAtDesc(@Param("sessionId") UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select round from QuizRound round where round.id = :id")
    Optional<QuizRound> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select round
            from QuizRound round
            where round.session.id = :sessionId
              and round.status in :statuses
            order by round.createdAt desc
            """)
    List<QuizRound> findCurrentBySessionIdForUpdate(
            @Param("sessionId") UUID sessionId,
            @Param("statuses") Set<QuizStatus> statuses
    );
}
