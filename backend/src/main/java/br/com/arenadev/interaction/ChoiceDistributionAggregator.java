package br.com.arenadev.interaction;

import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ChoiceDistributionAggregator {
    private final JsonMapper json;

    public ChoiceDistributionAggregator(JsonMapper json) {
        this.json = json;
    }

    public Map<String, Long> aggregate(
            InteractionDefinition definition,
            List<InteractionResponse> responses
    ) {
        if (definition.getResponseKind() != InteractionResponseKind.CHOICE) {
            return Map.of();
        }

        LinkedHashMap<String, Long> counts = new LinkedHashMap<>();
        for (InteractionOption option : definition.getOptions()) {
            counts.put(option.getOptionKey(), 0L);
        }

        for (InteractionResponse response : responses) {
            for (String key : selectedKeys(response.getResponseJson())) {
                if (!counts.containsKey(key)) {
                    throw new IllegalStateException(
                            "Resposta persistida contém alternativa fora da definição."
                    );
                }
                counts.computeIfPresent(key, (ignored, current) -> current + 1);
            }
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(counts));
    }

    private List<String> selectedKeys(String responseJson) {
        try {
            Map<String, Object> payload = json.readValue(
                    responseJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            Object raw = payload.get("selectedOptionKeys");
            if (!(raw instanceof List<?> list)) {
                throw new IllegalStateException(
                        "Resposta CHOICE persistida não possui selectedOptionKeys."
                );
            }
            return list.stream()
                    .map(item -> {
                        if (!(item instanceof String key)) {
                            throw new IllegalStateException(
                                    "Resposta CHOICE persistida possui chave inválida."
                            );
                        }
                        return key;
                    })
                    .toList();
        } catch (IllegalStateException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new IllegalStateException("Resposta CHOICE persistida possui JSON inválido.");
        }
    }
}
