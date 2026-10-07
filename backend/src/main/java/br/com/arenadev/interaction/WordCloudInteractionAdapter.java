package br.com.arenadev.interaction;

import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.wordcloud.WordCloudRound;
import br.com.arenadev.wordcloud.WordCloudSubmission;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class WordCloudInteractionAdapter {
    private final JsonMapper json;

    public WordCloudInteractionAdapter(JsonMapper json) {
        this.json = json;
    }

    public InteractionDefinition toDefinition(WordCloudRound round) {
        Objects.requireNonNull(round, "A rodada de Nuvem de Palavras é obrigatória.");
        if (round.getId() == null) {
            throw new IllegalArgumentException(
                    "A rodada precisa estar persistida antes da adaptação."
            );
        }

        InteractionDefinition definition = new InteractionDefinition(
                round.getPrompt(),
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.WORD_CLOUD,
                null,
                false,
                null,
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        "word-cloud-round:" + round.getId(),
                        null,
                        null,
                        round.getCreatedAt()
                )
        );
        definition.configureSubmissionPolicy(
                InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE
        );
        definition.configureResponse(writeJson(Map.of(
                "mode", "LIST",
                "minItems", 1,
                "maxItems", round.getMaxWordsPerParticipant(),
                "maxItemLength", 60
        )));
        definition.activate();
        return definition;
    }

    public String toCanonicalResponse(List<WordCloudSubmission> submissions) {
        Objects.requireNonNull(submissions, "As respostas da Nuvem são obrigatórias.");
        if (submissions.isEmpty()) {
            throw new IllegalArgumentException(
                    "Ao menos uma resposta da Nuvem é necessária."
            );
        }
        return writeJson(Map.of(
                "texts",
                submissions.stream()
                        .map(WordCloudSubmission::getRawText)
                        .toList()
        ));
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException(
                    "Não foi possível serializar a resposta da Nuvem para Interaction."
            );
        }
    }
}
