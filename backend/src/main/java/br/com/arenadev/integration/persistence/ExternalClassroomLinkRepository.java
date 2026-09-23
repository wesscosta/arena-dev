package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExternalClassroomLinkRepository extends JpaRepository<ExternalClassroomLinkEntity, UUID> {
    Optional<ExternalClassroomLinkEntity> findByConnectionIdAndClassroomId(UUID connectionId, UUID classroomId);
    Optional<ExternalClassroomLinkEntity> findByConnectionIdAndExternalClassroomId(UUID connectionId, String externalClassroomId);
    List<ExternalClassroomLinkEntity> findByConnectionId(UUID connectionId);
    List<ExternalClassroomLinkEntity> findByClassroomId(UUID classroomId);
}
