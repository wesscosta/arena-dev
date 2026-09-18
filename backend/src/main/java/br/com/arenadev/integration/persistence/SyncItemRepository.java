package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SyncItemRepository extends JpaRepository<SyncItemEntity, UUID> {
}
