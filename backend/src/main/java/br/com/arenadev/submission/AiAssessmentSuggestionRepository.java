package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiAssessmentSuggestionRepository extends JpaRepository<AiAssessmentSuggestion, UUID> {
    Optional<AiAssessmentSuggestion> findFirstByAssessmentIdOrderByCreatedAtDesc(UUID assessmentId);
    Optional<AiAssessmentSuggestion> findByIdAndAssessmentId(UUID id, UUID assessmentId);
}
