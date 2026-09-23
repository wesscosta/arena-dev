package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.SyncDirection;
import br.com.arenadev.integration.domain.SyncExecutionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SyncExecutionRepository extends JpaRepository<SyncExecutionEntity, UUID> {
    Optional<SyncExecutionEntity> findFirstByConnectionIdAndScopeAndDirectionAndStatusInOrderByCreatedAtDesc(
            UUID connectionId,
            String scope,
            SyncDirection direction,
            Collection<SyncExecutionStatus> statuses
    );
    List<SyncExecutionEntity> findTop10ByConnectionIdOrderByCreatedAtDesc(UUID connectionId);

    Optional<SyncExecutionEntity> findFirstByConnectionIdAndStatusOrderByFinishedAtDesc(
            UUID connectionId,
            SyncExecutionStatus status
    );
}
