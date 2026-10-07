package br.com.arenadev.interaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InteractionResponseRepository extends JpaRepository<InteractionResponse, UUID> {
    Optional<InteractionResponse> findByRunIdAndParticipantId(UUID runId, UUID participantId);
    List<InteractionResponse> findByRunIdOrderBySubmittedAtAsc(UUID runId);
    long countByRunId(UUID runId);
}
