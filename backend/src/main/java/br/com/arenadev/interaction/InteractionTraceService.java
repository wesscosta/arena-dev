package br.com.arenadev.interaction;

import br.com.arenadev.learning.ContentRef;
import br.com.arenadev.learning.LearningEvidence;
import br.com.arenadev.learning.LearningEvidenceService;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InteractionTraceService {
    private final InteractionRunRepository runRepository;
    private final InteractionResponseRepository responseRepository;
    private final InteractionEvaluationRepository evaluationRepository;
    private final LearningEvidenceService evidenceService;
    private final InteractionResultEngine resultEngine;

    public InteractionTraceService(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            InteractionEvaluationRepository evaluationRepository,
            LearningEvidenceService evidenceService,
            InteractionResultEngine resultEngine
    ) {
        this.runRepository = runRepository;
        this.responseRepository = responseRepository;
        this.evaluationRepository = evaluationRepository;
        this.evidenceService = evidenceService;
        this.resultEngine = resultEngine;
    }

    @Transactional(readOnly = true)
    public TraceView trace(UUID runId) {
        InteractionRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));
        InteractionDefinition definition = run.getDefinition();

        List<InteractionResponse> responses =
                responseRepository.findByRunIdOrderBySubmittedAtAsc(runId);
        List<InteractionEvaluation> evaluations =
                evaluationRepository.findByResponseRunIdOrderByEvaluatedAtAsc(runId);
        List<LearningEvidence> evidence = evidenceService.evidenceForRun(runId);

        Map<UUID, InteractionEvaluation> evaluationByResponse = new LinkedHashMap<>();
        for (InteractionEvaluation evaluation : evaluations) {
            evaluationByResponse.put(evaluation.getResponse().getId(), evaluation);
        }

        Map<UUID, LearningEvidence> evidenceByEvaluation = new LinkedHashMap<>();
        for (LearningEvidence item : evidence) {
            evidenceByEvaluation.put(item.getEvaluation().getId(), item);
        }

        List<ResponseTrace> responseTraces = new ArrayList<>();
        for (InteractionResponse response : responses) {
            InteractionEvaluation evaluation = evaluationByResponse.get(response.getId());
            LearningEvidence item = evaluation == null
                    ? null
                    : evidenceByEvaluation.get(evaluation.getId());

            responseTraces.add(new ResponseTrace(
                    response.getId(),
                    response.getParticipant().getId(),
                    response.getResponseJson(),
                    response.getRevision(),
                    response.getSubmittedAt(),
                    response.getUpdatedAt(),
                    evaluation == null ? null : new EvaluationTrace(
                            evaluation.getId(),
                            evaluation.getResponseRevision(),
                            evaluation.getOutcome(),
                            evaluation.getScore(),
                            evaluation.getEvaluatorType(),
                            evaluation.getEvaluatorVersion(),
                            evaluation.getDetailsJson(),
                            evaluation.getEvaluatedAt()
                    ),
                    item == null ? null : evidenceView(item)
            ));
        }

        Provenance provenance = definition.provenance();
        ContentRef contentRef = definition.contentRef();
        LearningTarget target = definition.getLearningTarget();

        DefinitionTrace definitionTrace = new DefinitionTrace(
                definition.getId(),
                definition.getPrompt(),
                definition.getResponseKind(),
                definition.getEvaluationMode(),
                definition.getPresentationMode(),
                definition.isProducesEvidence(),
                definition.getSchemaVersion(),
                target == null ? null : new LearningTargetTrace(
                        target.getId(),
                        target.getTitle(),
                        target.getType()
                ),
                contentRef == null ? null : new ContentRefTrace(
                        contentRef.sourceType(),
                        contentRef.sourceId(),
                        contentRef.sourceVersion(),
                        contentRef.anchor()
                ),
                new ProvenanceTrace(
                        provenance.origin(),
                        provenance.sourceRef(),
                        provenance.createdBy(),
                        provenance.reviewedBy(),
                        provenance.createdAt()
                )
        );

        InteractionResultEngine.ResultView result = resultEngine.result(runId);
        List<String> gaps = aiReadyGaps(run, definitionTrace, responseTraces);

        return new TraceView(
                run.getId(),
                run.getSession().getId(),
                run.getSession().getTitle(),
                run.getStatus(),
                run.getSequence(),
                run.getOpenedAt(),
                run.getResponsesLockedAt(),
                run.getResultsRevealedAt(),
                run.getClosedAt(),
                definitionTrace,
                List.copyOf(responseTraces),
                result,
                gaps.isEmpty(),
                List.copyOf(gaps)
        );
    }

    private static List<String> aiReadyGaps(
            InteractionRun run,
            DefinitionTrace definition,
            List<ResponseTrace> responses
    ) {
        List<String> gaps = new ArrayList<>();

        if (definition.provenance() == null
                || definition.provenance().origin() == null
                || definition.provenance().createdAt() == null) {
            gaps.add("definition.provenance");
        }
        if (definition.producesEvidence() && definition.learningTarget() == null) {
            gaps.add("definition.learningTarget");
        }
        if (run.getSession() == null || run.getSession().getId() == null) {
            gaps.add("run.session");
        }

        for (ResponseTrace response : responses) {
            if (response.participantId() == null) {
                gaps.add("response[" + response.id() + "].participant");
            }
            if (response.rawResponseJson() == null || response.rawResponseJson().isBlank()) {
                gaps.add("response[" + response.id() + "].raw");
            }

            if (definition.evaluationMode() != InteractionEvaluationMode.NONE
                    && run.getStatus() == InteractionRunStatus.CLOSED) {
                if (response.evaluation() == null) {
                    gaps.add("response[" + response.id() + "].evaluation");
                } else if (response.evaluation().evaluatorVersion() == null
                        || response.evaluation().evaluatorVersion().isBlank()) {
                    gaps.add("response[" + response.id() + "].evaluation.evaluatorVersion");
                }

                if (definition.producesEvidence() && response.evidence() == null) {
                    gaps.add("response[" + response.id() + "].learningEvidence");
                }
            }
        }

        return gaps;
    }

    private static LearningEvidenceTrace evidenceView(LearningEvidence evidence) {
        Provenance provenance = evidence.provenance();
        return new LearningEvidenceTrace(
                evidence.getId(),
                evidence.getParticipant().getId(),
                evidence.getLearningTarget().getId(),
                evidence.getSourceType(),
                evidence.getSourceId(),
                evidence.getOutcome(),
                evidence.getScore(),
                evidence.getConfidence(),
                new ProvenanceTrace(
                        provenance.origin(),
                        provenance.sourceRef(),
                        provenance.createdBy(),
                        provenance.reviewedBy(),
                        provenance.createdAt()
                ),
                evidence.getObservedAt()
        );
    }

    public record TraceView(
            UUID runId,
            UUID sessionId,
            String sessionTitle,
            InteractionRunStatus runStatus,
            int sequence,
            Instant openedAt,
            Instant responsesLockedAt,
            Instant resultsRevealedAt,
            Instant closedAt,
            DefinitionTrace definition,
            List<ResponseTrace> responses,
            InteractionResultEngine.ResultView result,
            boolean aiReady,
            List<String> gaps
    ) {
    }

    public record DefinitionTrace(
            UUID id,
            String prompt,
            InteractionResponseKind responseKind,
            InteractionEvaluationMode evaluationMode,
            InteractionPresentationMode presentationMode,
            boolean producesEvidence,
            int schemaVersion,
            LearningTargetTrace learningTarget,
            ContentRefTrace contentRef,
            ProvenanceTrace provenance
    ) {
    }

    public record LearningTargetTrace(
            UUID id,
            String title,
            br.com.arenadev.learning.LearningTargetType type
    ) {
    }

    public record ContentRefTrace(
            String sourceType,
            String sourceId,
            Integer sourceVersion,
            String anchor
    ) {
    }

    public record ProvenanceTrace(
            br.com.arenadev.learning.ProvenanceOrigin origin,
            String sourceRef,
            UUID createdBy,
            UUID reviewedBy,
            Instant createdAt
    ) {
    }

    public record ResponseTrace(
            UUID id,
            UUID participantId,
            String rawResponseJson,
            int revision,
            Instant submittedAt,
            Instant updatedAt,
            EvaluationTrace evaluation,
            LearningEvidenceTrace evidence
    ) {
    }

    public record EvaluationTrace(
            UUID id,
            int responseRevision,
            InteractionEvaluationOutcome outcome,
            BigDecimal score,
            InteractionEvaluatorType evaluatorType,
            String evaluatorVersion,
            String detailsJson,
            Instant evaluatedAt
    ) {
    }

    public record LearningEvidenceTrace(
            UUID id,
            UUID participantId,
            UUID learningTargetId,
            br.com.arenadev.learning.LearningEvidenceSourceType sourceType,
            UUID sourceId,
            br.com.arenadev.learning.LearningEvidenceOutcome outcome,
            BigDecimal score,
            BigDecimal confidence,
            ProvenanceTrace provenance,
            Instant observedAt
    ) {
    }
}
