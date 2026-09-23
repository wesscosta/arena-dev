package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class IntegrationConnectionService {
    private final IntegrationConnectionRepository repository;
    private final Clock clock;

    @Autowired
    public IntegrationConnectionService(IntegrationConnectionRepository repository) {
        this(repository, Clock.systemUTC());
    }

    IntegrationConnectionService(IntegrationConnectionRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public IntegrationConnectionEntity create(
            LearningPlatformProvider provider,
            String displayName,
            String externalTenantId
    ) {
        if (externalTenantId != null && !externalTenantId.isBlank()) {
            var existing = repository.findByProviderAndExternalTenantId(provider, externalTenantId.trim());
            if (existing.isPresent()) return existing.get();
        }

        Instant now = clock.instant();
        return repository.save(new IntegrationConnectionEntity(
                UUID.randomUUID(),
                provider,
                displayName,
                externalTenantId,
                null,
                IntegrationConnectionStatus.DRAFT,
                now
        ));
    }

    public IntegrationConnectionEntity attachCredentialReference(UUID connectionId, String reference) {
        var entity = required(connectionId);
        entity.attachCredentialReference(reference, clock.instant());
        return repository.save(entity);
    }

    public IntegrationConnectionEntity activate(UUID connectionId) {
        var entity = required(connectionId);
        entity.activate(clock.instant());
        return repository.save(entity);
    }

    public IntegrationConnectionEntity disable(UUID connectionId) {
        var entity = required(connectionId);
        entity.disable(clock.instant());
        return repository.save(entity);
    }

    @Transactional(readOnly = true)
    public List<IntegrationConnectionEntity> list() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public IntegrationConnectionEntity required(UUID connectionId) {
        return repository.findById(connectionId)
                .orElseThrow(() -> new IntegrationNotFoundException("Conexão não encontrada: " + connectionId));
    }
}
