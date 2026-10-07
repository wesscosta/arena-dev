package br.com.arenadev.interaction;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class InteractionEvaluationService {
    private final InteractionRunRepository runRepository;
    private final InteractionResponseRepository responseRepository;
    private final InteractionEvaluationRepository evaluationRepository;
    private final DeterministicInteractionEvaluator deterministicEvaluator;
    private final Clock clock;

    @Autowired
    public InteractionEvaluationService(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            InteractionEvaluationRepository evaluationRepository,
            DeterministicInteractionEvaluator deterministicEvaluator
    ) {
        this(
                runRepository,
                responseRepository,
                evaluationRepository,
                deterministicEvaluator,
                Clock.systemUTC()
        );
    }

    InteractionEvaluationService(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            InteractionEvaluationRepository evaluationRepository,
            DeterministicInteractionEvaluator deterministicEvaluator,
            Clock clock
    ) {
        this.runRepository = runRepository;
        this.responseRepository = responseRepository;
        this.evaluationRepository = evaluationRepository;
        this.deterministicEvaluator = deterministicEvaluator;
        this.clock = clock;
    }

    @Transactional
    public List<InteractionEvaluation> evaluateRun(UUID runId) {
        InteractionRun run = runRepository.findByIdForUpdate(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));

        if (run.acceptsResponses()) {
            throw new IllegalArgumentException(
                    "Bloqueie as respostas antes de avaliar a interação."
            );
        }

        InteractionDefinition definition = run.getDefinition();
        if (definition.getEvaluationMode() == InteractionEvaluationMode.NONE) {
            return List.of();
        }

        List<InteractionEvaluation> evaluated = new ArrayList<>();
        Instant now = Instant.now(clock);

        for (InteractionResponse response : responseRepository.findByRunIdOrderBySubmittedAtAsc(runId)) {
            InteractionEvaluation existing = evaluationRepository
                    .findByResponseId(response.getId())
                    .orElse(null);
            if (existing != null) {
                if (existing.getResponseRevision() != response.getRevision()) {
                    throw new IllegalStateException(
                            "A resposta mudou depois de ser avaliada; reavaliação explícita é necessária."
                    );
                }
                evaluated.add(existing);
                continue;
            }

            InteractionEvaluation evaluation = deterministicEvaluator.evaluate(
                    definition,
                    response,
                    now
            );
            evaluated.add(evaluationRepository.save(evaluation));
        }

        return List.copyOf(evaluated);
    }
}
