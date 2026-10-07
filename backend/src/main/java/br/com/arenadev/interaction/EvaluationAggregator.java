package br.com.arenadev.interaction;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EvaluationAggregator {
    public EvaluationResult aggregate(
            InteractionEvaluationMode mode,
            List<InteractionEvaluation> evaluations
    ) {
        if (mode == InteractionEvaluationMode.NONE) {
            return new EvaluationResult(0, 0, 0, 0, 0, null);
        }

        long correct = count(evaluations, InteractionEvaluationOutcome.CORRECT);
        long incorrect = count(evaluations, InteractionEvaluationOutcome.INCORRECT);
        long partial = count(evaluations, InteractionEvaluationOutcome.PARTIAL);
        long notEvaluated = count(evaluations, InteractionEvaluationOutcome.NOT_EVALUATED);
        long evaluated = correct + incorrect + partial;

        Double accuracy = evaluated == 0
                ? null
                : (double) correct / (double) evaluated;

        return new EvaluationResult(
                evaluations.size(),
                correct,
                incorrect,
                partial,
                notEvaluated,
                accuracy
        );
    }

    private long count(
            List<InteractionEvaluation> evaluations,
            InteractionEvaluationOutcome outcome
    ) {
        return evaluations.stream()
                .filter(item -> item.getOutcome() == outcome)
                .count();
    }

    public record EvaluationResult(
            long evaluationCount,
            long correctCount,
            long incorrectCount,
            long partialCount,
            long notEvaluatedCount,
            Double accuracy
    ) {
    }
}
