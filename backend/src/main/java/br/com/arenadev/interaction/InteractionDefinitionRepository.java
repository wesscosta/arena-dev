package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InteractionDefinitionRepository extends JpaRepository<InteractionDefinition, UUID> {
    List<InteractionDefinition> findByLearningTargetIdAndStatusOrderByCreatedAtDesc(
            UUID learningTargetId,
            InteractionDefinitionStatus status
    );
}
