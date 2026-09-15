package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentCriterionRepository extends JpaRepository<AssessmentCriterion, UUID> {
    List<AssessmentCriterion> findByAssessmentIdOrderByPositionAsc(UUID assessmentId);
    Optional<AssessmentCriterion> findByIdAndAssessmentId(UUID id, UUID assessmentId);
}
