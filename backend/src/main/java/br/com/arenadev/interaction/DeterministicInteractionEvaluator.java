package br.com.arenadev.interaction;

import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class DeterministicInteractionEvaluator {
    public static final String VERSION = "deterministic-choice-v1";

    private final JsonMapper json;

    public DeterministicInteractionEvaluator(JsonMapper json) {
        this.json = json;
    }

    public InteractionEvaluation evaluate(
            InteractionDefinition definition,
            InteractionResponse response,
            Instant now
    ) {
        if (definition.getEvaluationMode() != InteractionEvaluationMode.CORRECT_ANSWER) {
            throw new IllegalArgumentException("A interação não usa avaliação por resposta correta.");
        }
        if (definition.getResponseKind() != InteractionResponseKind.CHOICE) {
            throw new IllegalArgumentException(
                    "O evaluator determinístico v1 suporta apenas respostas CHOICE."
            );
        }

        Set<String> expected = keys(definition.getEvaluationConfigJson(), "correctOptionKeys");
        Set<String> selected = keys(response.getResponseJson(), "selectedOptionKeys");
        if (expected.isEmpty()) {
            throw new IllegalArgumentException("A interação não possui alternativas corretas configuradas.");
        }

        boolean correct = expected.equals(selected);
        return new InteractionEvaluation(
                response,
                correct ? InteractionEvaluationOutcome.CORRECT : InteractionEvaluationOutcome.INCORRECT,
                correct ? BigDecimal.ONE : BigDecimal.ZERO,
                InteractionEvaluatorType.DETERMINISTIC,
                VERSION,
                details(expected, selected),
                now
        );
    }

    private Set<String> keys(String rawJson, String field) {
        try {
            Map<String, Object> payload = json.readValue(
                    rawJson == null || rawJson.isBlank() ? "{}" : rawJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            Object raw = payload.get(field);
            if (!(raw instanceof List<?> list)) return Set.of();

            LinkedHashSet<String> values = new LinkedHashSet<>();
            for (Object value : list) {
                if (value instanceof String text && !text.isBlank()) {
                    values.add(text.trim());
                }
            }
            return Set.copyOf(values);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Contrato JSON inválido para avaliação determinística.");
        }
    }

    private String details(Set<String> expected, Set<String> selected) {
        try {
            return json.writeValueAsString(Map.of(
                    "expectedOptionKeys", expected,
                    "selectedOptionKeys", selected
            ));
        } catch (RuntimeException error) {
            return "{}";
        }
    }
}
