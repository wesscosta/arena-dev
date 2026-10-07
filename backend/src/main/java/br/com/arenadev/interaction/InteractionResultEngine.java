package br.com.arenadev.interaction;

import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InteractionResultEngine {
    private final InteractionRunRepository runRepository;
    private final InteractionResponseRepository responseRepository;
    private final InteractionEvaluationRepository evaluationRepository;
    private final SessionParticipantRepository participantRepository;
    private final ParticipationAggregator participationAggregator;
    private final ChoiceDistributionAggregator choiceDistributionAggregator;
    private final EvaluationAggregator evaluationAggregator;

    public InteractionResultEngine(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            InteractionEvaluationRepository evaluationRepository,
            SessionParticipantRepository participantRepository,
            ParticipationAggregator participationAggregator,
            ChoiceDistributionAggregator choiceDistributionAggregator,
            EvaluationAggregator evaluationAggregator
    ) {
        this.runRepository = runRepository;
        this.responseRepository = responseRepository;
        this.evaluationRepository = evaluationRepository;
        this.participantRepository = participantRepository;
        this.participationAggregator = participationAggregator;
        this.choiceDistributionAggregator = choiceDistributionAggregator;
        this.evaluationAggregator = evaluationAggregator;
    }

    @Transactional(readOnly = true)
    public ResultView result(UUID runId) {
        InteractionRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));
        InteractionDefinition definition = run.getDefinition();

        List<InteractionResponse> responses =
                responseRepository.findByRunIdOrderBySubmittedAtAsc(runId);
        List<InteractionEvaluation> evaluations =
                evaluationRepository.findByResponseRunIdOrderByEvaluatedAtAsc(runId);

        ParticipationAggregator.ParticipationResult participation =
                participationAggregator.aggregate(
                        participantRepository.countBySessionId(run.getSession().getId()),
                        responses.size()
                );

        Map<String, Long> distribution =
                choiceDistributionAggregator.aggregate(definition, responses);

        EvaluationAggregator.EvaluationResult evaluation =
                evaluationAggregator.aggregate(definition.getEvaluationMode(), evaluations);

        return new ResultView(
                run.getId(),
                run.getSession().getId(),
                definition.getId(),
                definition.getResponseKind(),
                definition.getEvaluationMode(),
                participation,
                distribution,
                evaluation
        );
    }

    public record ResultView(
            UUID runId,
            UUID sessionId,
            UUID interactionDefinitionId,
            InteractionResponseKind responseKind,
            InteractionEvaluationMode evaluationMode,
            ParticipationAggregator.ParticipationResult participation,
            Map<String, Long> choiceDistribution,
            EvaluationAggregator.EvaluationResult evaluation
    ) {
    }
}
