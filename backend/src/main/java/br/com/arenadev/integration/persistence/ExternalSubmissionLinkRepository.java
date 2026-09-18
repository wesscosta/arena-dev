package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ExternalSubmissionLinkRepository extends JpaRepository<ExternalSubmissionLinkEntity, UUID> {
    Optional<ExternalSubmissionLinkEntity> findByConnectionIdAndSubmissionId(UUID connectionId, UUID submissionId);
    Optional<ExternalSubmissionLinkEntity> findByConnectionIdAndExternalSubmissionId(UUID connectionId, String externalSubmissionId);
}
