package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface SyncExecutionRepository extends JpaRepository<SyncExecutionEntity, UUID> {
    Optional<SyncExecutionEntity> findFirstByConnectionIdAndScopeAndDirectionAndStatusInOrderByCreatedAtDesc(
            UUID connectionId,
            String scope,
            SyncDirection direction,
            Collection<SyncExecutionStatus> statuses
    );
}
