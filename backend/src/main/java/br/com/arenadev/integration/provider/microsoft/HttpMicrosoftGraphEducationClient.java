package br.com.arenadev.integration.provider.microsoft;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
public class HttpMicrosoftGraphEducationClient implements MicrosoftGraphEducationClient {
    private static final String FIRST_PAGE = "/education/classes";
    private final RestClient client;

    public HttpMicrosoftGraphEducationClient() {
        this(RestClient.builder().baseUrl("https://graph.microsoft.com/v1.0").build());
    }

    HttpMicrosoftGraphEducationClient(RestClient client) { this.client = client; }

    @Override
    public List<MicrosoftEducationClass> listClasses(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) throw new IllegalArgumentException("accessToken é obrigatório.");
        var result = new ArrayList<MicrosoftEducationClass>();
        String next = FIRST_PAGE;
        while (next != null && !next.isBlank()) {
            var page = getPage(accessToken, next);
            if (page.value() != null) page.value().stream().map(ClassPayload::toDomain).forEach(result::add);
            next = page.nextLink();
        }
        return List.copyOf(result);
    }

    private ClassPage getPage(String accessToken, String location) {
        try {
            var request = client.get();
            var response = location.startsWith("http://") || location.startsWith("https://")
                    ? request.uri(URI.create(location))
                    : request.uri(location);
            var page = response.headers(h -> h.setBearerAuth(accessToken)).retrieve().body(ClassPage.class);
            if (page == null) throw new MicrosoftGraphConnectionException("Microsoft Graph retornou resposta vazia ao listar turmas.");
            return page;
        } catch (RestClientResponseException error) {
            throw new MicrosoftGraphConnectionException(
                    "Falha ao listar turmas no Microsoft Graph. HTTP " + error.getStatusCode().value()
            );
        }
    }

    record ClassPage(List<ClassPayload> value, @JsonProperty("@odata.nextLink") String nextLink) {}

    record ClassPayload(
            String id, String displayName, String classCode, String externalId,
            String externalName, String description, String grade
    ) {
        MicrosoftEducationClass toDomain() {
            return new MicrosoftEducationClass(id, displayName, classCode, externalId, externalName, description, grade);
        }
    }
}
