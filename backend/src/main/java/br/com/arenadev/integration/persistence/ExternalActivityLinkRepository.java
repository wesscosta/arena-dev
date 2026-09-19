package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExternalActivityLinkRepository extends JpaRepository<ExternalActivityLinkEntity, UUID> {
    Optional<ExternalActivityLinkEntity> findByConnectionIdAndActivityId(UUID connectionId, UUID activityId);
    Optional<ExternalActivityLinkEntity> findByConnectionIdAndExternalActivityId(UUID connectionId, String externalActivityId);
    List<ExternalActivityLinkEntity> findByConnectionIdAndExternalClassroomLinkId(
            UUID connectionId,
            UUID externalClassroomLinkId
    );
}
