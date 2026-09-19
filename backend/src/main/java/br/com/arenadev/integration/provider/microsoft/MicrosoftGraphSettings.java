package br.com.arenadev.integration.provider.microsoft;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MicrosoftGraphSettings {
    private final String clientId;
    private final String clientSecret;

    public MicrosoftGraphSettings(
            @Value("${app.integrations.microsoft.client-id:}") String clientId,
            @Value("${app.integrations.microsoft.client-secret:}") String clientSecret
    ) {
        this.clientId = clean(clientId);
        this.clientSecret = clean(clientSecret);
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

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
