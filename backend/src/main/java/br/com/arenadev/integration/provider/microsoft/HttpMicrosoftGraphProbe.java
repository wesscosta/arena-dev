package br.com.arenadev.integration.provider.microsoft;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class HttpMicrosoftGraphProbe implements MicrosoftGraphProbe {
    private final RestClient client;

    public HttpMicrosoftGraphProbe() {
        this(RestClient.builder()
                .baseUrl("https://graph.microsoft.com/v1.0")
                .build());
    }

    HttpMicrosoftGraphProbe(RestClient client) {
        this.client = client;
    }

    @Override
    public void verifyEducationAccess(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("accessToken é obrigatório.");
        }

        try {
            client.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/education/classes")
                            .queryParam("$top", 1)
                            .queryParam("$select", "id,displayName")
                            .build())
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException error) {
            throw new MicrosoftGraphConnectionException(
                    "Microsoft Graph recusou o acesso Education. HTTP " + error.getStatusCode().value()
            );
        }
    }
}
