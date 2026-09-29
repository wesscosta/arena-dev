package br.com.arenadev.integration.provider.notion;

import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotionPageDiscoveryService {
    private final IntegrationConnectionRepository connections;
    private final IntegrationCredentialStore credentials;
    private final RestClient client;
    private final String apiVersion;
    private final JsonMapper json = JsonMapper.builder().build();

    public NotionPageDiscoveryService(IntegrationConnectionRepository connections, IntegrationCredentialStore credentials,
            @Value("${app.integrations.notion.api-version:2022-06-28}") String apiVersion,
            @Value("${app.integrations.notion.base-url:https://api.notion.com/v1}") String baseUrl) {
        this.connections = connections; this.credentials = credentials; this.apiVersion = apiVersion;
        this.client = RestClient.builder().baseUrl(baseUrl.replaceAll("/+$", "")).build();
    }

    public List<PageSummary> search(String query) {
        String token = activeToken();
        String escaped = query == null ? "" : query.trim().replace("\\", "\\\\").replace("\"", "\\\"");
        String body = "{\"page_size\":50,\"filter\":{\"property\":\"object\",\"value\":\"page\"}" + (escaped.isBlank() ? "" : ",\"query\":\"" + escaped + "\"") + "}";
        String response = client.post().uri("/search").header("Authorization", "Bearer " + token).header("Notion-Version", apiVersion)
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
        try {
            JsonNode root = json.readTree(response == null ? "{}" : response); List<PageSummary> pages = new ArrayList<>();
            for (JsonNode page : root.path("results")) {
                String id = page.path("id").asText(); String url = page.path("url").asText(); String title = pageTitle(page);
                if (!id.isBlank()) pages.add(new PageSummary(id, title.isBlank() ? "Página sem título" : title, url));
            }
            return pages;
        } catch (Exception error) { throw new IllegalStateException("Resposta inválida ao listar páginas do Notion.", error); }
    }

    private String activeToken() {
        for (var c : connections.findByProviderAndStatus(LearningPlatformProvider.NOTION, IntegrationConnectionStatus.ACTIVE)) {
            var material = credentials.read(c.getId());
            if (material.isPresent() && material.get().accessToken() != null && !material.get().accessToken().isBlank()) return material.get().accessToken();
        }
        throw new IllegalStateException("Conecte o Notion em Configurações → Integrações antes de buscar páginas.");
    }
    private String pageTitle(JsonNode page) {
        JsonNode props=page.path("properties"); var fields=props.properties().iterator();
        while(fields.hasNext()){JsonNode p=fields.next().getValue(); if("title".equals(p.path("type").asText())){StringBuilder out=new StringBuilder();for(JsonNode item:p.path("title"))out.append(item.path("plain_text").asText());return out.toString().trim();}}
        return "";
    }
    public record PageSummary(String id,String title,String url){}
}
