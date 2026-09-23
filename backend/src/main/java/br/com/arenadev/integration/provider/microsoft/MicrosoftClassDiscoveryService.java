package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class MicrosoftClassDiscoveryService {
    private final IntegrationConnectionService connections;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient educationClient;

    public MicrosoftClassDiscoveryService(
            IntegrationConnectionService connections,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient educationClient
    ) {
        this.connections = connections;
        this.tokenProvider = tokenProvider;
        this.educationClient = educationClient;
    }

    @Transactional(readOnly = true)
    public DiscoveryResult discover(UUID connectionId) {
        var connection = connections.required(connectionId);
        if (connection.getProvider() != LearningPlatformProvider.MICROSOFT_TEAMS) {
            throw new IllegalArgumentException("A conexão informada não pertence ao provider MICROSOFT_TEAMS.");
        }
        if (connection.getStatus() != IntegrationConnectionStatus.ACTIVE) {
            throw new IllegalStateException("A conexão Microsoft precisa estar ACTIVE para descobrir turmas.");
        }
        String tenantId = connection.getExternalTenantId();
        if (tenantId == null || tenantId.isBlank()) throw new IllegalStateException("Conexão Microsoft sem tenantId.");
        var token = tokenProvider.acquire(tenantId);
        var classes = educationClient.listClasses(token.token());
        return new DiscoveryResult(connection.getId(), tenantId, classes);
    }

    public record DiscoveryResult(UUID connectionId, String tenantId, List<MicrosoftEducationClass> classes) {
        public DiscoveryResult { classes = List.copyOf(classes); }
    }
}
