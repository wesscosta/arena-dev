package br.com.arenadev.wordcloud;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WordCloudRoundRepository extends JpaRepository<WordCloudRound, UUID> {
    Optional<WordCloudRound> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select round
            from WordCloudRound round
            where round.id = :id
            """)
    Optional<WordCloudRound> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select round
            from WordCloudRound round
            where round.session.id = :sessionId
              and round.status in :statuses
            order by round.createdAt desc
            """)
    List<WordCloudRound> findOpenBySessionIdForUpdate(
            @Param("sessionId") UUID sessionId,
            @Param("statuses") Set<WordCloudStatus> statuses
    );
}
