package br.com.arenadev.interaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InteractionShadowObservationRepository
        extends JpaRepository<InteractionShadowObservation, UUID> {

    List<InteractionShadowObservation> findByInteractionTypeOrderByObservedAtDesc(
            InteractionShadowType interactionType,
            Pageable pageable
    );
}
