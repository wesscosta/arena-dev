package br.com.arenadev.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LearningResourceRepository extends JpaRepository<LearningResource, UUID> {
    List<LearningResource> findByClassroomIdOrderByUpdatedAtDesc(UUID classroomId);
    List<LearningResource> findByLibraryVisibleTrueOrderByUpdatedAtDesc();
    List<LearningResource> findByArchivedAtIsNotNullOrderByUpdatedAtDesc();

    @Query("""
            select resource from LearningResource resource
            where resource.libraryVisible = true
              and (lower(resource.title) like lower(concat('%', :query, '%'))
                or lower(coalesce(resource.summary, '')) like lower(concat('%', :query, '%')))
            order by resource.updatedAt desc
            """)
    List<LearningResource> searchLibrary(@Param("query") String query);

    @Query("select case when count(stage) > 0 then true else false end from JourneyStage stage where stage.learningResource.id = :resourceId")
    boolean isReferencedByJourneyStage(@Param("resourceId") UUID resourceId);
}
