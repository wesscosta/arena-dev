package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRubricCriterionRepository extends JpaRepository<ActivityRubricCriterion, UUID> {
    List<ActivityRubricCriterion> findByActivityIdAndActiveTrueOrderByPositionAsc(UUID activityId);
}
