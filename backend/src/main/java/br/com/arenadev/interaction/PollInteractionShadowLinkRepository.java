package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PollInteractionShadowLinkRepository
        extends JpaRepository<PollInteractionShadowLink, UUID> {

    @Query("""
            select link
            from PollInteractionShadowLink link
            join fetch link.pollRound round
            join fetch round.session
            join fetch link.definition
            join fetch link.run
            where round.id = :pollRoundId
            """)
    Optional<PollInteractionShadowLink> findByPollRoundIdWithGraph(
            @Param("pollRoundId") UUID pollRoundId
    );
}
