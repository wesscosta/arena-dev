package br.com.arenadev.content.ingestion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiJourneyDraftProvider implements JourneyDraftAiProvider {
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final HttpClient httpClient;
    private final JsonMapper json = JsonMapper.builder().build();

    public OpenAiJourneyDraftProvider(
            @Value("${ARENA_AI_API_KEY:}") String apiKey,
            @Value("${ARENA_AI_BASE_URL:https://api.openai.com/v1}") String baseUrl,
            @Value("${ARENA_AI_MODEL:gpt-5.6-luna}") String model
    ) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = (baseUrl == null ? "https://api.openai.com/v1" : baseUrl.trim()).replaceAll("/+$", "");
        this.model = model == null || model.isBlank() ? "gpt-5.6-luna" : model.trim();
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
    }
    @Override
    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    @Override
    public ContentIngestionService.DraftView generate(ContentIngestionService.PreviewRequest request) {
        if (!isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "IA não configurada. Defina ARENA_AI_API_KEY no ambiente do backend."
            );
        }
        String brief = request.content() == null ? "" : request.content().trim();
        if (brief.isBlank()) {
            throw new IllegalArgumentException("Descreva a turma, objetivo ou conteúdo da jornada.");
        }
        if (brief.length() > 40_000) {
            throw new IllegalArgumentException("O briefing excede o limite de 40 mil caracteres.");
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("instructions", instructions());
            payload.put("input", json.writeValueAsString(Map.of(
                    "title", request.title() == null ? "" : request.title(),
                    "description", request.description() == null ? "" : request.description(),
                    "brief", brief
            )));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/responses"))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Falha no provedor de IA (HTTP " + response.statusCode() + ")."
                );
            }
            String clean = stripCodeFence(extractOutputText(response.body()));
            AiDraft parsed = json.readValue(clean, AiDraft.class);
            return normalize(parsed);
        } catch (ResponseStatusException error) {
            throw error;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Geração por IA interrompida.",
                    error
            );
        } catch (Exception error) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Não foi possível interpretar a jornada sugerida pela IA.",
                    error
            );
        }
    }

    private ContentIngestionService.DraftView normalize(AiDraft draft) {
        if (draft == null || draft.sections() == null || draft.sections().isEmpty()) {
            throw new IllegalStateException("A IA não retornou módulos para a jornada.");
        }
        List<ContentIngestionService.DraftSection> sections = new ArrayList<>();
        for (AiSection section : draft.sections()) {
            if (section == null || section.items() == null || section.items().isEmpty()) continue;
            List<ContentIngestionService.DraftItem> items = new ArrayList<>();
            for (AiItem item : section.items()) {
                if (item == null || item.title() == null || item.title().isBlank()) continue;
                DraftItemType type;
                try {
                    type = DraftItemType.valueOf(
                            item.type() == null ? "CONTENT" : item.type().trim().toUpperCase()
                    );
                } catch (IllegalArgumentException ignored) {
                    type = DraftItemType.CONTENT;
                }
                items.add(new ContentIngestionService.DraftItem(
                        item.title().trim(),
                        clean(item.description()),
                        type,
                        clean(item.body()),
                        clean(item.sourceUrl())
                ));
            }
            if (!items.isEmpty()) {
                sections.add(new ContentIngestionService.DraftSection(
                        valueOr(section.title(), "Módulo"),
                        clean(section.description()),
                        items
                ));
            }
        }
        if (sections.isEmpty()) {
            throw new IllegalStateException("A IA não retornou itens utilizáveis.");
        }
        return new ContentIngestionService.DraftView(
                valueOr(draft.title(), "Jornada sugerida"),
                valueOr(draft.description(), "Rascunho criado com assistência de IA."),
                ContentIngestionSource.AI,
                "Gerado com IA",
                sections
        );
    }
    private String instructions() {
        return """
                Você estrutura jornadas educacionais para professores.
                Não publique nada e não invente fontes externas.
                A saída é sempre um RASCUNHO que o professor revisará.
                Organize a jornada em módulos e itens.
                Use somente os tipos:
                CONTENT, ACTIVITY, QUIZ, CHALLENGE, CHECKPOINT, EXTERNAL_RESOURCE.
                CONTENT é explicação/material.
                ACTIVITY é produção ou prática.
                QUIZ é verificação objetiva.
                CHALLENGE é missão aplicada.
                CHECKPOINT é marco de consolidação.
                EXTERNAL_RESOURCE só deve ser usado se uma URL tiver sido fornecida.
                Prefira 2 a 6 módulos, com 2 a 6 itens por módulo.
                Não presuma que o professor usa Markdown, Notion ou qualquer ferramenta específica.
                Retorne APENAS JSON válido, sem markdown, no formato:
                {
                  "title": "título",
                  "description": "descrição curta",
                  "sections": [
                    {
                      "title": "módulo",
                      "description": "objetivo opcional",
                      "items": [
                        {
                          "title": "item",
                          "description": "descrição curta",
                          "type": "CONTENT",
                          "body": "conteúdo opcional em markdown",
                          "sourceUrl": null
                        }
                      ]
                    }
                  ]
                }
                """;
    }
    @SuppressWarnings("unchecked")
    private String extractOutputText(String body) throws Exception {
        Map<String, Object> root = json.readValue(body, Map.class);
        Object outputValue = root.get("output");
        if (outputValue instanceof List<?> output) {
            for (Object outputItem : output) {
                if (!(outputItem instanceof Map<?, ?> map)) continue;
                Object contentValue = map.get("content");
                if (!(contentValue instanceof List<?> content)) continue;
                for (Object contentItem : content) {
                    if (!(contentItem instanceof Map<?, ?> contentMap)) continue;
                    Object type = contentMap.get("type");
                    Object text = contentMap.get("text");
                    if ("output_text".equals(type) && text != null) {
                        return text.toString();
                    }
                }
            }
        }
        throw new IllegalStateException("Resposta do provedor não contém output_text.");
    }

    private String stripCodeFence(String value) {
        String text = value == null ? "" : value.trim();
        String fence = String.valueOf((char) 96).repeat(3);
        if (text.startsWith(fence)) {
            int firstBreak = text.indexOf('\n');
            int lastFence = text.lastIndexOf(fence);
            if (firstBreak >= 0 && lastFence > firstBreak) {
                return text.substring(firstBreak + 1, lastFence).trim();
            }
        }
        return text;
    }
    private static String valueOr(String value, String fallback) {
        String clean = clean(value);
        return clean == null ? fallback : clean;
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record AiDraft(
            String title,
            String description,
            List<AiSection> sections
    ) {}

    private record AiSection(
            String title,
            String description,
            List<AiItem> items
    ) {}

    private record AiItem(
            String title,
            String description,
            String type,
            String body,
            String sourceUrl
    ) {}
}
