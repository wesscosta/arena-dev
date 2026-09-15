package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiAssessmentCriterionSuggestionRepository extends JpaRepository<AiAssessmentCriterionSuggestion, UUID> {
    List<AiAssessmentCriterionSuggestion> findBySuggestionIdOrderByAssessmentCriterionPositionAsc(UUID suggestionId);
}
