package br.com.arenadev.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExternalResultImportRepository extends JpaRepository<ExternalResultImport, UUID> {
    List<ExternalResultImport> findByActivityIdOrderByCreatedAtDesc(UUID activityId);
    boolean existsByActivityIdAndFingerprint(UUID activityId, String fingerprint);
}
