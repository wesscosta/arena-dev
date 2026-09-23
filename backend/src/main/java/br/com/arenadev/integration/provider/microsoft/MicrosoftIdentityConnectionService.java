package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MicrosoftIdentityConnectionService {
    public static final String CREDENTIAL_REFERENCE = "microsoft-entra://client-credentials";

    private final MicrosoftGraphSettings settings;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphProbe graphProbe;
    private final IntegrationConnectionService connections;

    public MicrosoftIdentityConnectionService(
            MicrosoftGraphSettings settings,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphProbe graphProbe,
            IntegrationConnectionService connections
    ) {
        this.settings = settings;
        this.tokenProvider = tokenProvider;
        this.graphProbe = graphProbe;
        this.connections = connections;
    }

    public boolean configured() {
        return settings.configured();
    }

    @Transactional
    public IntegrationConnectionEntity connect(String displayName, String tenantId) {
        if (!settings.configured()) {
            throw new IllegalStateException("Credenciais Microsoft da aplicação não configuradas.");
        }

        var token = tokenProvider.acquire(tenantId);
        graphProbe.verifyEducationAccess(token.token());

        var connection = connections.create(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                displayName,
                tenantId
        );

        connection = connections.attachCredentialReference(
                connection.getId(),
                CREDENTIAL_REFERENCE
        );

        return connections.activate(connection.getId());
    }
}
