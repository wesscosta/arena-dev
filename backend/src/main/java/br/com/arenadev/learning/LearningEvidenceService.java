package br.com.arenadev.learning;

import br.com.arenadev.interaction.InteractionDefinition;
import br.com.arenadev.interaction.InteractionEvaluation;
import br.com.arenadev.interaction.InteractionEvaluationMode;
import br.com.arenadev.interaction.InteractionEvaluationRepository;
import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.interaction.InteractionRunRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LearningEvidenceService {
    private final InteractionRunRepository runRepository;
    private final InteractionEvaluationRepository evaluationRepository;
    private final LearningEvidenceRepository evidenceRepository;

    public LearningEvidenceService(
            InteractionRunRepository runRepository,
            InteractionEvaluationRepository evaluationRepository,
            LearningEvidenceRepository evidenceRepository
    ) {
        this.runRepository = runRepository;
        this.evaluationRepository = evaluationRepository;
        this.evidenceRepository = evidenceRepository;
    }

    @Transactional
    public List<LearningEvidence> recordForRun(UUID runId) {
        InteractionRun run = runRepository.findByIdForUpdate(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));
        InteractionDefinition definition = run.getDefinition();

        if (!definition.isProducesEvidence()) {
            return List.of();
        }
        if (definition.getLearningTarget() == null) {
            throw new IllegalStateException(
                    "Uma interação que produz evidência precisa de LearningTarget."
            );
        }
        if (definition.getEvaluationMode() == InteractionEvaluationMode.NONE) {
            throw new IllegalStateException(
                    "Uma interação sem avaliação não pode produzir LearningEvidence nesta versão."
            );
        }

        List<LearningEvidence> evidence = new ArrayList<>();
        for (InteractionEvaluation evaluation :
                evaluationRepository.findByResponseRunIdOrderByEvaluatedAtAsc(runId)) {
            LearningEvidence existing = evidenceRepository
                    .findByEvaluationId(evaluation.getId())
                    .orElse(null);
            if (existing != null) {
                evidence.add(existing);
                continue;
            }

            LearningEvidence created = new LearningEvidence(
                    evaluation.getResponse().getParticipant(),
                    definition.getLearningTarget(),
                    evaluation,
                    LearningEvidenceSourceType.INTERACTION,
                    run.getId(),
                    LearningEvidenceOutcome.valueOf(evaluation.getOutcome().name()),
                    evaluation.getScore(),
                    null,
                    new Provenance(
                            ProvenanceOrigin.SYSTEM,
                            "interaction-evaluation:" + evaluation.getId(),
                            null,
                            null,
                            evaluation.getEvaluatedAt()
                    ),
                    evaluation.getEvaluatedAt()
            );
            evidence.add(evidenceRepository.save(created));
        }
        return List.copyOf(evidence);
    }

    @Transactional(readOnly = true)
    public List<LearningEvidence> evidenceForRun(UUID runId) {
        return evidenceRepository.findBySourceTypeAndSourceIdOrderByObservedAtAsc(
                LearningEvidenceSourceType.INTERACTION,
                runId
        );
    }
}
