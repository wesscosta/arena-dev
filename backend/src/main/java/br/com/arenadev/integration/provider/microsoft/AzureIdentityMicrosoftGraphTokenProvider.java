package br.com.arenadev.integration.provider.microsoft;

import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.ClientSecretCredentialBuilder;
import org.springframework.stereotype.Component;

@Component
public class AzureIdentityMicrosoftGraphTokenProvider implements MicrosoftGraphTokenProvider {
    private static final String GRAPH_SCOPE = "https://graph.microsoft.com/.default";

    private final MicrosoftGraphSettings settings;

    public AzureIdentityMicrosoftGraphTokenProvider(MicrosoftGraphSettings settings) {
        this.settings = settings;
    }

    @Override
    public MicrosoftGraphAccessToken acquire(String tenantId) {
        String tenant = required(tenantId, "tenantId");

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

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }
}
