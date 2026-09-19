package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExternalStudentLinkRepository extends JpaRepository<ExternalStudentLinkEntity, UUID> {
    Optional<ExternalStudentLinkEntity> findByConnectionIdAndEnrollmentId(UUID connectionId, UUID enrollmentId);

    Optional<ExternalStudentLinkEntity> findByConnectionIdAndExternalClassroomLinkIdAndExternalUserId(
            UUID connectionId,
            UUID externalClassroomLinkId,
            String externalUserId
    );
}
