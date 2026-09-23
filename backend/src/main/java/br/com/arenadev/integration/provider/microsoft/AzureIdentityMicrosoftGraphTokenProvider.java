package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.ClientSecretCredentialBuilder;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;

@Component
public class AzureIdentityMicrosoftGraphTokenProvider implements MicrosoftGraphTokenProvider {
    private static final String GRAPH_SCOPE = "https://graph.microsoft.com/.default";

    private final MicrosoftGraphSettings settings;
    private final IntegrationConnectionRepository connections;
    private final IntegrationCredentialStore credentials;
    private final RestClient loginClient;

    public AzureIdentityMicrosoftGraphTokenProvider(
            MicrosoftGraphSettings settings,
            IntegrationConnectionRepository connections,
            IntegrationCredentialStore credentials
    ) {
        this.settings = settings;
        this.connections = connections;
        this.credentials = credentials;
        this.loginClient = RestClient.builder()
                .baseUrl("https://login.microsoftonline.com")
                .build();
    }

    @Override
    public MicrosoftGraphAccessToken acquire(String tenantId) {
        String tenant = required(tenantId, "tenantId");

        var connection = connections.findByProviderAndExternalTenantId(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                tenant
        );

        if (connection.isPresent()) {
            var stored = credentials.read(connection.get().getId());
            if (stored.isPresent()) {
                return delegated(connection.get().getId(), stored.get());
            }
        }

        try {
            var credential = new ClientSecretCredentialBuilder()
                    .tenantId(tenant)
                    .clientId(settings.requiredClientId())
                    .clientSecret(settings.requiredClientSecret())
                    .build();

            var token = credential
                    .getToken(new TokenRequestContext().addScopes(GRAPH_SCOPE))
                    .block();

            if (token == null) {
                throw new MicrosoftGraphConnectionException("Microsoft Entra não retornou token.");
            }

            return new MicrosoftGraphAccessToken(token.getToken(), token.getExpiresAt());
        } catch (MicrosoftGraphConnectionException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new MicrosoftGraphConnectionException(
                    "Falha ao autenticar a aplicação no Microsoft Entra ID.",
                    error
            );
        }
    }

    private MicrosoftGraphAccessToken delegated(
            java.util.UUID connectionId,
            IntegrationCredentialStore.CredentialMaterial material
    ) {
        OffsetDateTime now = OffsetDateTime.now();
        if (material.accessToken() != null
                && material.expiresAt() != null
                && material.expiresAt().isAfter(now.plusMinutes(2))) {
            return new MicrosoftGraphAccessToken(
                    material.accessToken(),
                    material.expiresAt()
            );
        }

        if (material.refreshToken() == null || material.refreshToken().isBlank()) {
            throw new MicrosoftGraphConnectionException(
                    "Conexão Microsoft sem refresh token. Reconecte com Microsoft 365."
            );
        }

        var form = new LinkedMultiValueMap<String, String>();
        form.add("client_id", settings.requiredClientId());
        form.add("client_secret", settings.requiredClientSecret());
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", material.refreshToken());
        form.add("scope", settings.delegatedScopes());

        RefreshTokenResponse response = loginClient.post()
                .uri("/common/oauth2/v2.0/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(RefreshTokenResponse.class);

        if (response == null || response.access_token() == null) {
            throw new MicrosoftGraphConnectionException(
                    "Microsoft Entra não retornou token ao renovar a conexão."
            );
        }

        OffsetDateTime expiresAt = now.plusSeconds(Math.max(60, response.expires_in()));
        String refreshToken = response.refresh_token() == null
                ? material.refreshToken()
                : response.refresh_token();

        credentials.store(
                connectionId,
                new IntegrationCredentialStore.CredentialMaterial(
                        response.access_token(),
                        refreshToken,
                        null,
                        expiresAt
                )
        );

        return new MicrosoftGraphAccessToken(response.access_token(), expiresAt);
    }

    record RefreshTokenResponse(
            String access_token,
            String refresh_token,
            long expires_in
    ) {}

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }
}
