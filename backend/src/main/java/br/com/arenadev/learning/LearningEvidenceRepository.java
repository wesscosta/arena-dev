package br.com.arenadev.learning;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearningEvidenceRepository extends JpaRepository<LearningEvidence, UUID> {
    Optional<LearningEvidence> findByEvaluationId(UUID evaluationId);

    List<LearningEvidence> findBySourceTypeAndSourceIdOrderByObservedAtAsc(
            LearningEvidenceSourceType sourceType,
            UUID sourceId
    );

    List<LearningEvidence> findByParticipantIdAndLearningTargetIdOrderByObservedAtAsc(
            UUID participantId,
            UUID learningTargetId
    );
}
