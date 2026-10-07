package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface WordCloudInteractionShadowLinkRepository
        extends JpaRepository<WordCloudInteractionShadowLink, UUID> {

    @Query("""
            select link
            from WordCloudInteractionShadowLink link
            join fetch link.wordCloudRound round
            join fetch round.session
            join fetch link.definition
            join fetch link.run
            where round.id = :roundId
            """)
    Optional<WordCloudInteractionShadowLink> findByRoundIdWithGraph(
            @Param("roundId") UUID roundId
    );
}
