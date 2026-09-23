package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Service
public class MicrosoftDelegatedOAuthService {
    private static final String STATE_KEY = "arena.microsoft.oauth.state";

    private final MicrosoftGraphSettings settings;
    private final IntegrationCredentialStore credentials;
    private final IntegrationConnectionService connections;
    private final MicrosoftGraphProbe graphProbe;
    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient client;
    private final String frontendUrl;
    private final String credentialEncryptionKey;
    private final SecureRandom random = new SecureRandom();

    public MicrosoftDelegatedOAuthService(
            MicrosoftGraphSettings settings,
            IntegrationCredentialStore credentials,
            IntegrationConnectionService connections,
            MicrosoftGraphProbe graphProbe,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${app.integrations.credential-encryption-key:}") String credentialEncryptionKey
    ) {
        this.settings = settings;
        this.credentials = credentials;
        this.connections = connections;
        this.graphProbe = graphProbe;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.credentialEncryptionKey = credentialEncryptionKey == null
                ? ""
                : credentialEncryptionKey.trim();
        this.client = RestClient.builder()
                .baseUrl("https://login.microsoftonline.com")
                .build();
    }

    public String authorizationUrl(HttpSession session) {
        settings.requireOAuthConfigured();
        if (credentialEncryptionKey.isBlank()) {
            throw new IllegalStateException(
                    "Configure APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY antes de conectar o Microsoft 365."
            );
        }
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String state = HexFormat.of().formatHex(bytes);
        session.setAttribute(STATE_KEY, state);

        return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
                + "?client_id=" + encode(settings.requiredClientId())
                + "&response_type=code"
                + "&redirect_uri=" + encode(settings.requiredRedirectUri())
                + "&response_mode=query"
                + "&scope=" + encode(settings.delegatedScopes())
                + "&state=" + encode(state);
    }

    public CallbackResult complete(String code, String state, HttpSession session) {
        settings.requireOAuthConfigured();
        Object expected = session.getAttribute(STATE_KEY);
        session.removeAttribute(STATE_KEY);

        if (!(expected instanceof String expectedState) || !expectedState.equals(state)) {
            throw new IllegalArgumentException("State OAuth Microsoft inválido ou expirado.");
        }

        var form = new LinkedMultiValueMap<String, String>();
        form.add("client_id", settings.requiredClientId());
        form.add("client_secret", settings.requiredClientSecret());
        form.add("code", required(code, "code"));
        form.add("redirect_uri", settings.requiredRedirectUri());
        form.add("grant_type", "authorization_code");
        form.add("scope", settings.delegatedScopes());

        TokenResponse token = client.post()
                .uri("/common/oauth2/v2.0/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TokenResponse.class);

        if (token == null || token.access_token() == null) {
            throw new MicrosoftGraphConnectionException(
                    "Microsoft Entra não retornou access token."
            );
        }

        Claims claims = claims(token.id_token());
        String tenantId = required(claims.tid(), "tenantId retornado pela Microsoft");
        String user = firstNonBlank(
                claims.preferred_username(),
                claims.email(),
                claims.name(),
                "Microsoft 365"
        );

        graphProbe.verifyEducationAccess(token.access_token());

        var connection = connections.create(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Microsoft 365 · " + user,
                tenantId
        );

        String reference = credentials.store(
                connection.getId(),
                new IntegrationCredentialStore.CredentialMaterial(
                        token.access_token(),
                        token.refresh_token(),
                        null,
                        OffsetDateTime.now().plusSeconds(Math.max(60, token.expires_in()))
                )
        );

        connection = connections.attachCredentialReference(connection.getId(), reference);
        connection = connections.activate(connection.getId());

        return new CallbackResult(
                connection.getId().toString(),
                tenantId,
                user,
                frontendUrl + "/?microsoft=connected"
        );
    }

    private Claims claims(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new MicrosoftGraphConnectionException("Microsoft Entra não retornou id_token.");
        }
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) throw new IllegalArgumentException("JWT inválido.");
            byte[] json = Base64.getUrlDecoder().decode(parts[1]);
            return mapper.readValue(json, Claims.class);
        } catch (Exception error) {
            throw new MicrosoftGraphConnectionException(
                    "Não foi possível interpretar a identidade Microsoft retornada.",
                    error
            );
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "Microsoft 365";
    }

    public record CallbackResult(
            String connectionId,
            String tenantId,
            String user,
            String redirectUrl
    ) {}

    public record TokenResponse(
            String token_type,
            String scope,
            long expires_in,
            String access_token,
            String refresh_token,
            String id_token
    ) {}

    public record Claims(
            String tid,
            String name,
            String preferred_username,
            String email
    ) {}
}
