package br.com.arenadev.integration.provider.google;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GoogleClassroomSettings {
    private final String clientId, clientSecret, redirectUri;

    public GoogleClassroomSettings(
            @Value("${app.integrations.google.client-id:}") String clientId,
            @Value("${app.integrations.google.client-secret:}") String clientSecret,
            @Value("${app.integrations.google.redirect-uri:http://localhost:8080/api/integrations/google/oauth/callback}") String redirectUri
    ) {
        this.clientId = clean(clientId);
        this.clientSecret = clean(clientSecret);
        this.redirectUri = clean(redirectUri);
    }

    public boolean oauthConfigured() { return clientId != null && clientSecret != null && redirectUri != null; }
    public void requireOAuthConfigured() {
        if (!oauthConfigured()) throw new IllegalStateException("Google Classroom OAuth não configurado no servidor.");
    }
    public String requiredClientId() { if (clientId == null) throw new IllegalStateException("Google client-id não configurado."); return clientId; }
    public String requiredClientSecret() { if (clientSecret == null) throw new IllegalStateException("Google client-secret não configurado."); return clientSecret; }
    public String requiredRedirectUri() { if (redirectUri == null) throw new IllegalStateException("Google redirect-uri não configurada."); return redirectUri; }
    public String delegatedScopes() {
        return "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly";
    }
    private static String clean(String v) { return v == null || v.isBlank() ? null : v.trim(); }
}
