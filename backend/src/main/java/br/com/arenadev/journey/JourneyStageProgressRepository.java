package br.com.arenadev.journey;

import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.Query;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JourneyStageProgressRepository extends JpaRepository<JourneyStageProgress, UUID> {
    Optional<JourneyStageProgress> findByStageIdAndEnrollmentId(UUID stageId, UUID enrollmentId);
    List<JourneyStageProgress> findByStageJourneyIdAndEnrollmentId(UUID journeyId, UUID enrollmentId);
    java.util.List<JourneyStageProgress> findByEnrollmentStudentIdAndCompletedAtIsNotNull(java.util.UUID studentId);

    /** Any study started on these stages, by classroom enrollment or by redeemed access. */
    @Query(value = """
            select exists(select 1 from journey_stage_progress where journey_stage_id in (:stageIds))
                or exists(select 1 from student_journey_stage_progress where journey_stage_id in (:stageIds))
            """, nativeQuery = true)
    boolean anyStudyStarted(@Param("stageIds") java.util.Collection<UUID> stageIds);
}
