package br.com.arenadev.integration.provider.microsoft;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MicrosoftGraphSettings {
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public MicrosoftGraphSettings(
            @Value("${app.integrations.microsoft.client-id:}") String clientId,
            @Value("${app.integrations.microsoft.client-secret:}") String clientSecret,
            @Value("${app.integrations.microsoft.redirect-uri:http://localhost:8080/api/integrations/microsoft/oauth/callback}") String redirectUri
    ) {
        this.clientId = clean(clientId);
        this.clientSecret = clean(clientSecret);
        this.redirectUri = clean(redirectUri);
    }

    public boolean configured() {
        return clientId != null && clientSecret != null;
    }

    public String requiredClientId() {
        if (clientId == null) throw new IllegalStateException("Microsoft client-id não configurado.");
        return clientId;
    }

    public String requiredClientSecret() {
        if (clientSecret == null) throw new IllegalStateException("Microsoft client-secret não configurado.");
        return clientSecret;
    }

    public boolean oauthConfigured() {
        return configured() && redirectUri != null;
    }

    public void requireOAuthConfigured() {
        if (!oauthConfigured()) {
            throw new IllegalStateException(
                    "Microsoft OAuth não configurado no servidor."
            );
        }
    }

    public String requiredRedirectUri() {
        if (redirectUri == null) throw new IllegalStateException("Microsoft redirect-uri não configurada.");
        return redirectUri;
    }

    public String delegatedScopes() {
        return "openid profile offline_access "
                + "https://graph.microsoft.com/EduRoster.ReadBasic "
                + "https://graph.microsoft.com/EduAssignments.ReadWrite";
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
