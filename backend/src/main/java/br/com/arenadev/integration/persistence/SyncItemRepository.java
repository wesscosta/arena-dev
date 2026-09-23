package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SyncItemRepository extends JpaRepository<SyncItemEntity, UUID> {
    Optional<SyncItemEntity> findByExecutionIdAndItemTypeAndItemKey(UUID executionId, String itemType, String itemKey);
    List<SyncItemEntity> findByExecutionIdOrderByUpdatedAtDesc(UUID executionId);
}
