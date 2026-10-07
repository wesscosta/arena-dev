package br.com.arenadev.interaction;

import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.poll.PollOption;
import br.com.arenadev.poll.PollRound;
import br.com.arenadev.poll.PollVote;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class PollInteractionAdapter {
    private final JsonMapper json;

    public PollInteractionAdapter(JsonMapper json) {
        this.json = json;
    }

    public InteractionDefinition toDefinition(PollRound round) {
        Objects.requireNonNull(round, "A votação é obrigatória.");
        if (round.getId() == null) {
            throw new IllegalArgumentException(
                    "A votação precisa estar persistida antes da adaptação."
            );
        }

        InteractionDefinition definition = new InteractionDefinition(
                round.getPrompt(),
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        "poll-round:" + round.getId(),
                        null,
                        null,
                        round.getCreatedAt()
                )
        );
        definition.configureSubmissionPolicy(InteractionSubmissionPolicy.ONE_SUBMISSION);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");

        for (PollOption option : round.getOptions()) {
            definition.addOption(
                    optionKey(option),
                    option.getLabel(),
                    option.getPosition(),
                    null
            );
        }

        definition.activate();
        return definition;
    }

    public String toCanonicalResponse(PollVote vote) {
        Objects.requireNonNull(vote, "O voto é obrigatório.");
        return writeJson(Map.of(
                "selectedOptionKeys",
                List.of(optionKey(vote.getOption()))
        ));
    }

    public String optionKey(PollOption option) {
        Objects.requireNonNull(option, "A opção da votação é obrigatória.");
        if (option.getId() == null) {
            throw new IllegalArgumentException(
                    "A opção precisa estar persistida antes da adaptação."
            );
        }
        return option.getId().toString();
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException(
                    "Não foi possível serializar o voto para Interaction."
            );
        }
    }
}
