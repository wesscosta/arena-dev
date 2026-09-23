package br.com.arenadev.integration.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncCheckpointRepository extends JpaRepository<SyncCheckpointEntity, SyncCheckpointKey> {
}
