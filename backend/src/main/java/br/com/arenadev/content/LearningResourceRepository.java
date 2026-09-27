package br.com.arenadev.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LearningResourceRepository extends JpaRepository<LearningResource, UUID> {
    List<LearningResource> findByClassroomIdOrderByUpdatedAtDesc(UUID classroomId);

    @Query("select case when count(stage) > 0 then true else false end from JourneyStage stage where stage.learningResource.id = :resourceId")
    boolean isReferencedByJourneyStage(@Param("resourceId") UUID resourceId);
}
