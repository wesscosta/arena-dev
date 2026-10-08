package br.com.arenadev.interaction;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.learning.ContentRef;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class QuizInteractionAdapter {
    private final JsonMapper json;

    public QuizInteractionAdapter(JsonMapper json) {
        this.json = json;
    }

    public InteractionDefinition toDefinition(ActivityQuestion question) {
        Objects.requireNonNull(question, "A questão é obrigatória.");
        if (question.getId() == null) {
            throw new IllegalArgumentException("A questão precisa estar persistida antes da adaptação.");
        }
        if (question.getType() != QuestionType.MULTIPLE_CHOICE
                && question.getType() != QuestionType.TRUE_FALSE) {
            throw new IllegalArgumentException(
                    "O adapter do Quiz suporta apenas múltipla escolha e verdadeiro/falso."
            );
        }

        InteractionDefinition definition = new InteractionDefinition(
                question.getStatement(),
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                new ContentRef(
                        "ACTIVITY_QUESTION",
                        question.getId().toString(),
                        null,
                        null
                ),
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        "activity-question:" + question.getId(),
                        null,
                        null,
                        Instant.now()
                )
        );
        definition.configureSubmissionPolicy(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");

        if (question.getType() == QuestionType.TRUE_FALSE) {
            definition.addOption("true", "Verdadeiro", 0, null);
            definition.addOption("false", "Falso", 1, null);
        } else {
            int position = 0;
            for (LegacyOption option : options(question)) {
                definition.addOption(option.id(), option.text(), position++, null);
            }
        }

        String correctKey = correctOptionKey(question);
        definition.configureEvaluation(
                writeJson(Map.of("correctOptionKeys", List.of(correctKey)))
        );
        definition.activate();
        return definition;
    }

    public String toCanonicalResponse(ActivityQuestion question, String legacyAnswerJson) {
        return writeJson(Map.of(
                "selectedOptionKeys",
                List.of(answerOptionKey(question, legacyAnswerJson))
        ));
    }

    public String answerOptionKey(ActivityQuestion question, String legacyAnswerJson) {
        Object answer = readJsonValue(legacyAnswerJson);
        return switch (question.getType()) {
            case MULTIPLE_CHOICE -> {
                if (!(answer instanceof String selected) || selected.isBlank()) {
                    throw new IllegalArgumentException("Resposta legada de múltipla escolha inválida.");
                }
                yield selected;
            }
            case TRUE_FALSE -> {
                if (!(answer instanceof Boolean selected)) {
                    throw new IllegalArgumentException("Resposta legada verdadeiro/falso inválida.");
                }
                yield Boolean.toString(selected);
            }
            default -> throw new IllegalArgumentException("Tipo de questão não suportado pelo adapter.");
        };
    }

    public String correctOptionKey(ActivityQuestion question) {
        Object expected = readJsonValue(question.getAnswerJson());
        String key = switch (question.getType()) {
            case MULTIPLE_CHOICE -> {
                if (!(expected instanceof String selected) || selected.isBlank()) {
                    throw new IllegalArgumentException("Gabarito de múltipla escolha inválido.");
                }
                yield selected;
            }
            case TRUE_FALSE -> {
                if (!(expected instanceof Boolean selected)) {
                    throw new IllegalArgumentException("Gabarito verdadeiro/falso inválido.");
                }
                yield Boolean.toString(selected);
            }
            default -> throw new IllegalArgumentException("Tipo de questão não suportado pelo adapter.");
        };

        boolean exists = question.getType() == QuestionType.TRUE_FALSE
                || options(question).stream().anyMatch(option -> option.id().equals(key));
        if (!exists) {
            throw new IllegalArgumentException("O gabarito não corresponde às alternativas da questão.");
        }
        return key;
    }

    public List<LegacyOption> options(ActivityQuestion question) {
        if (question.getType() == QuestionType.TRUE_FALSE) {
            return List.of(
                    new LegacyOption("true", "Verdadeiro"),
                    new LegacyOption("false", "Falso")
            );
        }
        if (question.getOptionsJson() == null || question.getOptionsJson().isBlank()) {
            throw new IllegalArgumentException("A questão não possui alternativas.");
        }
        try {
            List<LegacyOption> options = json.readValue(
                    question.getOptionsJson(),
                    new TypeReference<List<LegacyOption>>() {}
            );
            if (options == null || options.isEmpty()) {
                throw new IllegalArgumentException("A questão não possui alternativas.");
            }
            for (LegacyOption option : options) {
                if (option.id() == null || option.id().isBlank()
                        || option.text() == null || option.text().isBlank()) {
                    throw new IllegalArgumentException("A questão possui alternativa inválida.");
                }
            }
            return List.copyOf(options);
        } catch (IllegalArgumentException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("As alternativas da questão possuem JSON inválido.");
        }
    }

    private Object readJsonValue(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return json.readValue(value, Object.class);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("JSON legado inválido.");
        }
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Não foi possível serializar o contrato da interação.");
        }
    }

    public record LegacyOption(String id, String text) {
    }
}
