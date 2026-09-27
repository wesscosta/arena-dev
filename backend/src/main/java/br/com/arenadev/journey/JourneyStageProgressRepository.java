package br.com.arenadev.journey;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyStageProgressRepository extends JpaRepository<JourneyStageProgress, UUID> {
    Optional<JourneyStageProgress> findByStageIdAndEnrollmentId(UUID stageId, UUID enrollmentId);
    List<JourneyStageProgress> findByStageJourneyIdAndEnrollmentId(UUID journeyId, UUID enrollmentId);
}
