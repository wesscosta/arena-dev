package br.com.arenadev.content.ingestion;

import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotionApiPageProvider implements NotionPageProvider {
    private final String fallbackToken;
    private final IntegrationConnectionRepository connections;
    private final IntegrationCredentialStore credentials;
    private final String apiVersion;
    private final RestClient client;
    private final JsonMapper json;

    public NotionApiPageProvider(
            @Value("${app.integrations.notion.token:}") String token,
            IntegrationConnectionRepository connections,
            IntegrationCredentialStore credentials,
            @Value("${app.integrations.notion.api-version:2022-06-28}") String apiVersion,
            @Value("${app.integrations.notion.base-url:https://api.notion.com/v1}") String baseUrl,
            JsonMapper json
    ) {
        this.fallbackToken = token == null ? "" : token.trim();
        this.connections = connections;
        this.credentials = credentials;
        this.apiVersion = apiVersion == null || apiVersion.isBlank() ? "2022-06-28" : apiVersion.trim();
        this.client = RestClient.builder().baseUrl(baseUrl == null || baseUrl.isBlank() ? "https://api.notion.com/v1" : baseUrl.trim().replaceAll("/+$", "")).build();
            this.json = json;
}

    @Override public boolean isConfigured() {
        return !fallbackToken.isBlank() || !connections.findByProviderAndStatus(LearningPlatformProvider.NOTION, IntegrationConnectionStatus.ACTIVE).isEmpty();
    }

    private String accessToken() {
        var active = connections.findByProviderAndStatus(LearningPlatformProvider.NOTION, IntegrationConnectionStatus.ACTIVE);
        for (var connection : active) {
            var material = credentials.read(connection.getId());
            if (material.isPresent() && material.get().accessToken() != null && !material.get().accessToken().isBlank()) return material.get().accessToken();
        }
        if (!fallbackToken.isBlank()) return fallbackToken;
        throw new IllegalStateException("Nenhuma conexão OAuth ativa do Notion está disponível.");
    }

    @Override
    public NotionPageSnapshot fetch(String pageId) {
        if (!isConfigured()) throw new IllegalStateException("Integração do Notion não configurada.");
        if (pageId == null || pageId.isBlank()) throw new IllegalArgumentException("Não foi possível identificar a página do Notion pela URL.");
        try {
            JsonNode page = get("/pages/" + pageId);
            String title = pageTitle(page);
            List<NotionBlock> blocks = new ArrayList<>();
            collectChildren(pageId, blocks, 0);
            return new NotionPageSnapshot(pageId, title, blocks);
        } catch (RestClientResponseException error) {
            if (error.getStatusCode().value() == 401 || error.getStatusCode().value() == 403 || error.getStatusCode().value() == 404) {
                throw new IllegalArgumentException("A página não está acessível pela integração do Notion. Compartilhe a página com a integração configurada.", error);
            }
            throw new IllegalStateException("Falha ao consultar a API do Notion (HTTP " + error.getStatusCode().value() + ").", error);
        }
    }

    private void collectChildren(String blockId, List<NotionBlock> out, int depth) {
        if (depth > 32) throw new IllegalArgumentException("A página do Notion excede a profundidade suportada.");
        String cursor = null;
        do {
            String path = "/blocks/" + blockId + "/children?page_size=100" + (cursor == null ? "" : "&start_cursor=" + cursor);
            JsonNode response = get(path);
            JsonNode results = response.get("results");
            if (results != null && results.isArray()) {
                for (JsonNode block : results) {
                    String id = text(block, "id");
                    String type = text(block, "type");
                    int headingLevel = switch (type == null ? "" : type) {
                        case "heading_1" -> 1; case "heading_2" -> 2; case "heading_3" -> 3; default -> 0;
                    };
                    String value = blockText(block, type);
                    if (value != null && !value.isBlank()) out.add(new NotionBlock(id, type, headingLevel, value));
                    if (block.path("has_children").asBoolean(false) && id != null) collectChildren(id, out, depth + 1);
                }
            }
            cursor = response.path("has_more").asBoolean(false) ? text(response, "next_cursor") : null;
        } while (cursor != null && !cursor.isBlank());
    }

    private JsonNode get(String path) {
        String body = client.get().uri(path).header("Authorization", "Bearer " + accessToken()).header("Notion-Version", apiVersion).retrieve().body(String.class);
        try { return json.readTree(body == null ? "{}" : body); }
        catch (Exception error) { throw new IllegalStateException("Resposta inválida da API do Notion.", error); }
    }

    private String pageTitle(JsonNode page) {
        JsonNode properties = page.get("properties");
        if (properties != null && properties.isObject()) {
            var iterator = properties.properties().iterator();
            while (iterator.hasNext()) {
                JsonNode property = iterator.next().getValue();
                if ("title".equals(text(property, "type"))) {
                    String value = richText(property.get("title"));
                    if (!value.isBlank()) return value;
                }
            }
        }
        return null;
    }

    private String blockText(JsonNode block, String type) {
        if (type == null) return null;
        JsonNode payload = block.get(type);
        if (payload == null) return null;
        String rich = richText(payload.get("rich_text"));
        if (rich.isBlank()) return null;
        return switch (type) {
            case "bulleted_list_item" -> "- " + rich;
            case "numbered_list_item" -> "1. " + rich;
            case "to_do" -> (payload.path("checked").asBoolean(false) ? "- [x] " : "- [ ] ") + rich;
            case "quote" -> "> " + rich;
            case "code" -> "```" + textOrEmpty(payload, "language") + "\n" + rich + "\n```";
            default -> rich;
        };
    }

    private String richText(JsonNode array) {
        if (array == null || !array.isArray()) return "";
        StringBuilder out = new StringBuilder();
        for (JsonNode item : array) {
            JsonNode plain = item.get("plain_text");
            if (plain != null && !plain.isNull()) out.append(plain.asText());
        }
        return out.toString().trim();
    }
    private static String text(JsonNode node, String field) { JsonNode value = node == null ? null : node.get(field); return value == null || value.isNull() ? null : value.asText(); }
    private static String textOrEmpty(JsonNode node, String field) { String value = text(node, field); return value == null ? "" : value; }
}
