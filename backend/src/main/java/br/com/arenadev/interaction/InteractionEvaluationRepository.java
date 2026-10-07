package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InteractionEvaluationRepository extends JpaRepository<InteractionEvaluation, UUID> {
    Optional<InteractionEvaluation> findByResponseId(UUID responseId);
    List<InteractionEvaluation> findByResponseRunIdOrderByEvaluatedAtAsc(UUID runId);
    long countByResponseRunIdAndOutcome(UUID runId, InteractionEvaluationOutcome outcome);
}
