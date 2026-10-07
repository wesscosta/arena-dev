package br.com.arenadev.interaction;

import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class InteractionResponseValidator {
    private final JsonMapper json;

    public InteractionResponseValidator(JsonMapper json) {
        this.json = json;
    }

    public void validate(InteractionDefinition definition, String responseJson) {
        if (definition.getResponseKind() == InteractionResponseKind.CHOICE) {
            validateChoice(definition, responseJson);
            return;
        }
        if (definition.getResponseKind() == InteractionResponseKind.TEXT) {
            validateText(responseJson);
            return;
        }
        throw new IllegalArgumentException("Tipo de resposta não suportado.");
    }

    private void validateChoice(InteractionDefinition definition, String responseJson) {
        Map<String, Object> payload = object(responseJson);
        Object rawKeys = payload.get("selectedOptionKeys");
        if (!(rawKeys instanceof List<?> rawList)) {
            throw new IllegalArgumentException("A resposta CHOICE exige selectedOptionKeys.");
        }

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        for (Object raw : rawList) {
            if (!(raw instanceof String value) || value.isBlank()) {
                throw new IllegalArgumentException("selectedOptionKeys contém valor inválido.");
            }
            if (!keys.add(value.trim())) {
                throw new IllegalArgumentException("selectedOptionKeys não pode conter duplicatas.");
            }
        }

        SelectionLimits limits = limits(definition.getResponseConfigJson());
        if (keys.size() < limits.minSelections() || keys.size() > limits.maxSelections()) {
            throw new IllegalArgumentException(
                    "A quantidade de alternativas selecionadas não respeita a configuração da interação."
            );
        }

        Set<String> valid = definition.getOptions().stream()
                .map(InteractionOption::getOptionKey)
                .collect(java.util.stream.Collectors.toSet());

        if (!valid.containsAll(keys)) {
            throw new IllegalArgumentException("A resposta contém alternativa inexistente.");
        }
    }

    private void validateText(String responseJson) {
        Map<String, Object> payload = object(responseJson);
        Object rawText = payload.get("text");
        if (!(rawText instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException("A resposta TEXT exige text não vazio.");
        }
    }

    private SelectionLimits limits(String configJson) {
        Map<String, Object> config = object(configJson == null || configJson.isBlank() ? "{}" : configJson);
        int min = integer(config.get("minSelections"), 1);
        int max = integer(config.get("maxSelections"), 1);
        if (min < 0 || max < 1 || min > max) {
            throw new IllegalArgumentException("Configuração de seleção inválida.");
        }
        return new SelectionLimits(min, max);
    }

    private int integer(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number number) return number.intValue();
        throw new IllegalArgumentException("Configuração numérica inválida.");
    }

    private Map<String, Object> object(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            throw new IllegalArgumentException("A resposta JSON é obrigatória.");
        }
        try {
            return json.readValue(rawJson, new TypeReference<Map<String, Object>>() {});
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Resposta JSON inválida.");
        }
    }

    private record SelectionLimits(int minSelections, int maxSelections) {
    }
}
