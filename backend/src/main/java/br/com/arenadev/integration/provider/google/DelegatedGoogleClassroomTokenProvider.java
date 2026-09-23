package br.com.arenadev.integration.provider.google;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class DelegatedGoogleClassroomTokenProvider implements GoogleClassroomTokenProvider {
    private final GoogleClassroomSettings settings;
    private final IntegrationConnectionService connections;
    private final IntegrationCredentialStore credentials;
    private final RestClient client = RestClient.builder().baseUrl("https://oauth2.googleapis.com").build();

    public DelegatedGoogleClassroomTokenProvider(GoogleClassroomSettings settings, IntegrationConnectionService connections, IntegrationCredentialStore credentials) {
        this.settings = settings; this.connections = connections; this.credentials = credentials;
    }

    public GoogleClassroomAccessToken acquire(UUID connectionId) {
        var c = connections.required(connectionId);
        if (c.getProvider() != LearningPlatformProvider.GOOGLE_CLASSROOM) throw new IllegalArgumentException("A conexão informada não pertence ao provider GOOGLE_CLASSROOM.");
        if (c.getStatus() != IntegrationConnectionStatus.ACTIVE) throw new IllegalStateException("A conexão Google Classroom precisa estar ACTIVE.");
        var m = credentials.read(connectionId).orElseThrow(() -> new GoogleClassroomConnectionException("Conexão Google sem credencial delegada. Reconecte sua conta Google."));
        var now = OffsetDateTime.now();
        if (m.accessToken() != null && m.expiresAt() != null && m.expiresAt().isAfter(now.plusMinutes(2))) return new GoogleClassroomAccessToken(m.accessToken(), m.expiresAt());
        if (m.refreshToken() == null || m.refreshToken().isBlank()) throw new GoogleClassroomConnectionException("Conexão Google sem refresh token. Reconecte sua conta Google.");
        settings.requireOAuthConfigured();
        var form = new LinkedMultiValueMap<String,String>();
        form.add("client_id", settings.requiredClientId()); form.add("client_secret", settings.requiredClientSecret());
        form.add("refresh_token", m.refreshToken()); form.add("grant_type", "refresh_token");
        TokenResponse r;
        try {
            r = client.post().uri("/token").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(TokenResponse.class);
        } catch (RuntimeException e) { throw new GoogleClassroomConnectionException("Falha ao renovar a conexão Google Classroom.", e); }
        if (r == null || r.access_token() == null) throw new GoogleClassroomConnectionException("Google OAuth não retornou access token ao renovar a conexão.");
        var expires = now.plusSeconds(Math.max(60, r.expires_in()));
        credentials.store(connectionId, new IntegrationCredentialStore.CredentialMaterial(r.access_token(), m.refreshToken(), null, expires));
        return new GoogleClassroomAccessToken(r.access_token(), expires);
    }
    record TokenResponse(String access_token, long expires_in, String token_type, String scope) {}
}
