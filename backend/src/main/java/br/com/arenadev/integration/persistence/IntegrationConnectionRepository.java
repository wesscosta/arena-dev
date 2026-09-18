package br.com.arenadev.integration.persistence;

import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationConnectionRepository extends JpaRepository<IntegrationConnectionEntity, UUID> {
    Optional<IntegrationConnectionEntity> findByProviderAndExternalTenantId(LearningPlatformProvider provider, String externalTenantId);
}
