package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface IntegrationConnectionRepository extends JpaRepository<IntegrationConnectionEntity, UUID> {
    List<IntegrationConnectionEntity> findByProviderAndStatus(LearningPlatformProvider provider, br.com.arenadev.integration.domain.IntegrationConnectionStatus status);
    Optional<IntegrationConnectionEntity> findByProviderAndExternalTenantId(LearningPlatformProvider provider, String externalTenantId);
}
