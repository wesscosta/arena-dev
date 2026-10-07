package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface QuizInteractionShadowLinkRepository
        extends JpaRepository<QuizInteractionShadowLink, UUID> {

    @Query("""
            select link
            from QuizInteractionShadowLink link
            join fetch link.quizRound round
            join fetch round.session
            join fetch round.question
            join fetch link.definition
            join fetch link.run
            where round.id = :quizRoundId
            """)
    Optional<QuizInteractionShadowLink> findByQuizRoundIdWithGraph(
            @Param("quizRoundId") UUID quizRoundId
    );
}
