package br.com.arenadev.submission;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OpenAiAssessmentProvider implements AssessmentAiProvider {
    private static final String PROVIDER = "OPENAI";
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final HttpClient httpClient;
    private final JsonMapper json = JsonMapper.builder().build();

    public OpenAiAssessmentProvider(
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
    public Result analyze(Request request) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "IA não configurada. Defina ARENA_AI_API_KEY no ambiente do backend."
            );
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("instructions", instructions());
            payload.put("input", json.writeValueAsString(request));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/responses"))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Falha no provedor de IA (HTTP " + response.statusCode() + ")."
                );
            }

            String outputText = extractOutputText(response.body());
            String clean = stripCodeFence(outputText);
            AiRawResponse parsed = json.readValue(clean, AiRawResponse.class);
            if (parsed.criteria() == null || parsed.criteria().isEmpty()) {
                throw new IllegalStateException("A IA não retornou sugestões por critério.");
            }

            List<CriterionSuggestion> criteria = new ArrayList<>();
            for (AiRawCriterion item : parsed.criteria()) {
                criteria.add(new CriterionSuggestion(
                        UUID.fromString(item.criterionId()),
                        item.suggestedPoints(),
                        item.suggestedComment(),
                        item.evidence(),
                        item.confidence()
                ));
            }
            return new Result(PROVIDER, model, parsed.summaryFeedback(), criteria, clean);
        } catch (ResponseStatusException error) {
            throw error;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Análise por IA interrompida.", error);
        } catch (Exception error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Não foi possível interpretar a resposta da IA.", error);
        }
    }

    private String instructions() {
        return """
                Você é um assistente de correção educacional em português do Brasil.
                Sua função é SUGERIR, nunca decidir a nota final.
                Avalie somente pelas evidências recebidas e pela rubrica.
                Não infira autoria, plágio, intenção, uso de IA ou conduta do estudante.
                Se faltar evidência, reduza a confiança e explique a limitação.
                Para cada criterionId recebido, retorne exatamente uma sugestão.
                suggestedPoints deve ficar entre 0 e maxPoints do critério.
                confidence deve ficar entre 0 e 1.
                Retorne APENAS JSON válido, sem markdown, neste formato:
                {
                  "summaryFeedback": "síntese objetiva para o professor",
                  "criteria": [
                    {
                      "criterionId": "UUID",
                      "suggestedPoints": 0.0,
                      "suggestedComment": "justificativa curta",
                      "evidence": "evidência observada na entrega",
                      "confidence": 0.0
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
                    if ("output_text".equals(type) && text != null) return text.toString();
                }
            }
        }
        throw new IllegalStateException("Resposta do provedor não contém output_text.");
    }

    private String stripCodeFence(String value) {
        String text = value == null ? "" : value.trim();
        if (text.startsWith("```")) {
            int firstBreak = text.indexOf('\n');
            int lastFence = text.lastIndexOf("```");
            if (firstBreak >= 0 && lastFence > firstBreak) {
                return text.substring(firstBreak + 1, lastFence).trim();
            }
        }
        return text;
    }

    private record AiRawResponse(String summaryFeedback, List<AiRawCriterion> criteria) {}
    private record AiRawCriterion(
            String criterionId,
            BigDecimal suggestedPoints,
            String suggestedComment,
            String evidence,
            BigDecimal confidence
    ) {}
}
