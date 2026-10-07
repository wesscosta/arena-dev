package br.com.arenadev.interaction;

import br.com.arenadev.learning.LearningEvidence;
import br.com.arenadev.learning.LearningEvidenceService;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.learning.LearningTargetRepository;
import br.com.arenadev.learning.LearningTargetStatus;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LearningCheckService {
    private final ClassSessionRepository sessionRepository;
    private final LearningTargetRepository targetRepository;
    private final InteractionDefinitionRepository definitionRepository;
    private final InteractionRunRepository runRepository;
    private final InteractionEvaluationService evaluationService;
    private final InteractionResultEngine resultEngine;
    private final LearningEvidenceService evidenceService;
    private final InteractionResponseService responseService;
    private final SessionRealtimeGateway realtimeGateway;
    private final LiveStageService liveStageService;
    private final JsonMapper json;

    public LearningCheckService(
            ClassSessionRepository sessionRepository,
            LearningTargetRepository targetRepository,
            InteractionDefinitionRepository definitionRepository,
            InteractionRunRepository runRepository,
            InteractionEvaluationService evaluationService,
            InteractionResultEngine resultEngine,
            LearningEvidenceService evidenceService,
            InteractionResponseService responseService,
            SessionRealtimeGateway realtimeGateway,
            LiveStageService liveStageService,
            JsonMapper json
    ) {
        this.sessionRepository = sessionRepository;
        this.targetRepository = targetRepository;
        this.definitionRepository = definitionRepository;
        this.runRepository = runRepository;
        this.evaluationService = evaluationService;
        this.resultEngine = resultEngine;
        this.evidenceService = evidenceService;
        this.responseService = responseService;
        this.realtimeGateway = realtimeGateway;
        this.liveStageService = liveStageService;
        this.json = json;
    }

    @Transactional
    public StateView prepare(UUID sessionId, PrepareCommand command) {
        ClassSession session = activeSessionForUpdate(sessionId);
        ensureNoPendingRun(sessionId);

        LearningTarget target = targetRepository.findById(command.learningTargetId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Objetivo de aprendizagem não encontrado."
                ));
        if (target.getStatus() != LearningTargetStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "O objetivo de aprendizagem precisa estar ativo."
            );
        }

        List<OptionCommand> options = validateOptions(command.options());
        String correctKey = requireCorrectKey(command.correctOptionKey(), options);

        InteractionDefinition definition = new InteractionDefinition(
                command.prompt(),
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                target,
                true,
                null,
                new Provenance(
                        ProvenanceOrigin.TEACHER,
                        "learning-check",
                        null,
                        null,
                        Instant.now()
                )
        );
        definition.configureSubmissionPolicy(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        definition.configureResponse(writeJson(Map.of(
                "minSelections", 1,
                "maxSelections", 1
        )));
        definition.configureEvaluation(writeJson(Map.of(
                "correctOptionKeys", List.of(correctKey)
        )));
        for (int index = 0; index < options.size(); index++) {
            OptionCommand option = options.get(index);
            definition.addOption(option.key(), option.label(), index, null);
        }
        definition.activate();
        definition = definitionRepository.saveAndFlush(definition);

        int sequence = runRepository.findFirstBySessionIdOrderBySequenceDesc(sessionId)
                .map(last -> last.getSequence() + 1)
                .orElse(1);
        InteractionRun run = runRepository.saveAndFlush(
                new InteractionRun(session, definition, sequence)
        );
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional
    public StateView open(UUID sessionId, UUID runId) {
        InteractionRun run = runForSession(runId, sessionId);
        run.open(Instant.now());
        liveStageService.showLearningCheck(sessionId, runId);
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional
    public StateView lock(UUID sessionId, UUID runId) {
        InteractionRun run = runForSession(runId, sessionId);
        run.lockResponses(Instant.now());
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional
    public StateView evaluate(UUID sessionId, UUID runId) {
        InteractionRun run = runForSession(runId, sessionId);
        evaluationService.evaluateRun(runId);
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional
    public StateView reveal(UUID sessionId, UUID runId) {
        InteractionRun run = runForSession(runId, sessionId);
        if (run.acceptsResponses()) {
            throw new IllegalArgumentException(
                    "Bloqueie as respostas antes de revelar uma verificação de aprendizagem."
            );
        }
        evaluationService.evaluateRun(runId);
        run.revealResults(Instant.now());
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional
    public StateView close(UUID sessionId, UUID runId) {
        InteractionRun run = runForSession(runId, sessionId);
        Instant now = Instant.now();
        if (run.acceptsResponses()) {
            run.lockResponses(now);
        }
        evaluationService.evaluateRun(runId);
        run.close(now);
        StateView next = state(run);
        publishAfterCommit(run, next);
        return next;
    }

    @Transactional(readOnly = true)
    public StateView current(UUID sessionId) {
        sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        InteractionRun run = currentRun(sessionId);
        return run == null ? StateView.empty() : state(run);
    }

    @Transactional(readOnly = true)
    public StateView state(UUID sessionId, UUID runId) {
        return state(runForSessionReadOnly(runId, sessionId));
    }

    @Transactional
    public ParticipantStateView submit(
            UUID sessionId,
            UUID runId,
            UUID participantId,
            String optionKey
    ) {
        InteractionRun run = runForSession(runId, sessionId);
        String normalizedKey = requireSubmittedOption(optionKey, run.getDefinition());
        responseService.submit(
                runId,
                participantId,
                writeJson(Map.of("selectedOptionKeys", List.of(normalizedKey)))
        );
        StateView teacherState = state(run);
        publishAfterCommit(run, teacherState);
        return participantState(run, participantId);
    }

    @Transactional(readOnly = true)
    public ParticipantStateView participantState(UUID sessionId, UUID participantId) {
        sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        InteractionRun run = currentRun(sessionId);
        return run == null ? ParticipantStateView.empty() : participantState(run, participantId);
    }

    private StateView state(InteractionRun run) {
        InteractionDefinition definition = run.getDefinition();
        InteractionResultEngine.ResultView result = resultEngine.result(run.getId());

        List<LearningEvidence> evidence = evidenceService.evidenceForRun(run.getId());
        return new StateView(
                new RunView(
                        run.getId(),
                        run.getStatus(),
                        run.getSequence(),
                        run.acceptsResponses(),
                        run.resultsVisiblePublicly(),
                        run.getOpenedAt(),
                        run.getResponsesLockedAt(),
                        run.getResultsRevealedAt(),
                        run.getClosedAt()
                ),
                new DefinitionView(
                        definition.getId(),
                        definition.getPrompt(),
                        definition.getLearningTarget().getId(),
                        definition.getLearningTarget().getTitle(),
                        definition.getOptions().stream()
                                .map(option -> new OptionView(
                                        option.getOptionKey(),
                                        option.getLabel(),
                                        option.getPosition()
                                ))
                                .toList()
                ),
                result,
                evidence.size()
        );
    }

    private InteractionRun currentRun(UUID sessionId) {
        return runRepository
                .findFirstBySessionIdAndStatusAndDefinitionProducesEvidenceTrueOrderBySequenceDesc(
                        sessionId,
                        InteractionRunStatus.ACTIVE
                )
                .orElseGet(() -> runRepository
                        .findFirstBySessionIdAndStatusAndDefinitionProducesEvidenceTrueOrderBySequenceDesc(
                                sessionId,
                                InteractionRunStatus.CREATED
                        )
                        .orElseGet(() -> runRepository
                                .findFirstBySessionIdAndDefinitionProducesEvidenceTrueOrderBySequenceDesc(
                                        sessionId
                                )
                                .orElse(null)));
    }

    private ParticipantStateView participantState(
            InteractionRun run,
            UUID participantId
    ) {
        InteractionDefinition definition = run.getDefinition();
        InteractionResponse response = responseService
                .findParticipantResponseOptional(run.getId(), participantId)
                .orElse(null);
        return new ParticipantStateView(
                run.getId(),
                run.getStatus(),
                definition.getPrompt(),
                definition.getLearningTarget().getId(),
                definition.getLearningTarget().getTitle(),
                definition.getOptions().stream()
                        .map(option -> new OptionView(
                                option.getOptionKey(),
                                option.getLabel(),
                                option.getPosition()
                        ))
                        .toList(),
                run.acceptsResponses(),
                response != null,
                response == null ? null : selectedOptionKey(response.getResponseJson()),
                run.resultsVisiblePublicly(),
                run.resultsVisiblePublicly() ? correctOptionKey(definition) : null
        );
    }

    private void publishAfterCommit(InteractionRun run, StateView teacherState) {
        UUID sessionId = run.getSession().getId();
        realtimeGateway.broadcastTeachersAfterCommit(
                sessionId,
                "LEARNING_CHECK_STATE",
                teacherState
        );
        realtimeGateway.broadcastParticipantsAfterCommit(
                sessionId,
                "LEARNING_CHECK_STATE",
                new ParticipantSignalView(
                        run.getId(),
                        run.getStatus(),
                        run.acceptsResponses(),
                        run.resultsVisiblePublicly()
                )
        );
    }

    private String selectedOptionKey(String responseJson) {
        try {
            Map<String, Object> payload = json.readValue(
                    responseJson,
                    new TypeReference<Map<String, Object>>() {}
            );
            Object raw = payload.get("selectedOptionKeys");
            if (!(raw instanceof List<?> keys) || keys.size() != 1
                    || !(keys.getFirst() instanceof String key) || key.isBlank()) {
                return null;
            }
            return key;
        } catch (RuntimeException error) {
            return null;
        }
    }

    private String correctOptionKey(InteractionDefinition definition) {
        try {
            Map<String, Object> payload = json.readValue(
                    definition.getEvaluationConfigJson(),
                    new TypeReference<Map<String, Object>>() {}
            );
            Object raw = payload.get("correctOptionKeys");
            if (!(raw instanceof List<?> keys) || keys.size() != 1
                    || !(keys.getFirst() instanceof String key) || key.isBlank()) {
                return null;
            }
            return key;
        } catch (RuntimeException error) {
            return null;
        }
    }

    private static String requireSubmittedOption(
            String rawOptionKey,
            InteractionDefinition definition
    ) {
        if (rawOptionKey == null || rawOptionKey.isBlank()) {
            throw new IllegalArgumentException("Selecione uma alternativa.");
        }
        String key = rawOptionKey.trim();
        boolean exists = definition.getOptions().stream()
                .anyMatch(option -> option.getOptionKey().equals(key));
        if (!exists) {
            throw new IllegalArgumentException("A alternativa selecionada não existe.");
        }
        return key;
    }

    private ClassSession activeSessionForUpdate(UUID sessionId) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
        return session;
    }

    private void ensureNoPendingRun(UUID sessionId) {
        boolean active = runRepository.findFirstBySessionIdAndStatus(
                sessionId,
                InteractionRunStatus.ACTIVE
        ).isPresent();
        boolean created = runRepository.findFirstBySessionIdAndStatus(
                sessionId,
                InteractionRunStatus.CREATED
        ).isPresent();
        if (active || created) {
            throw new IllegalArgumentException(
                    "Finalize a interação atual antes de preparar uma nova verificação."
            );
        }
    }

    private InteractionRun runForSession(UUID runId, UUID sessionId) {
        InteractionRun run = runRepository.findByIdForUpdate(runId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Verificação de aprendizagem não encontrada."
                ));
        ensureRunSession(run, sessionId);
        return run;
    }

    private InteractionRun runForSessionReadOnly(UUID runId, UUID sessionId) {
        InteractionRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Verificação de aprendizagem não encontrada."
                ));
        ensureRunSession(run, sessionId);
        return run;
    }

    private static void ensureRunSession(InteractionRun run, UUID sessionId) {
        if (!run.getSession().getId().equals(sessionId)) {
            throw new ResourceNotFoundException(
                    "Verificação de aprendizagem não encontrada nesta sessão."
            );
        }
        if (!run.getDefinition().isProducesEvidence()) {
            throw new IllegalArgumentException(
                    "A interação informada não é uma verificação de aprendizagem."
            );
        }
    }

    private static List<OptionCommand> validateOptions(List<OptionCommand> options) {
        if (options == null || options.size() < 2 || options.size() > 6) {
            throw new IllegalArgumentException(
                    "A verificação exige entre 2 e 6 alternativas."
            );
        }
        LinkedHashSet<String> keys = new LinkedHashSet<>();
        for (OptionCommand option : options) {
            if (option == null || option.key() == null || option.key().isBlank()
                    || option.label() == null || option.label().isBlank()) {
                throw new IllegalArgumentException("Alternativa inválida.");
            }
            if (!keys.add(option.key().trim())) {
                throw new IllegalArgumentException(
                        "As chaves das alternativas precisam ser únicas."
                );
            }
        }
        return options.stream()
                .map(option -> new OptionCommand(
                        option.key().trim(),
                        option.label().trim()
                ))
                .toList();
    }

    private static String requireCorrectKey(
            String raw,
            List<OptionCommand> options
    ) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Informe a alternativa correta.");
        }
        String key = raw.trim();
        boolean exists = options.stream().anyMatch(option -> option.key().equals(key));
        if (!exists) {
            throw new IllegalArgumentException(
                    "A alternativa correta precisa existir na verificação."
            );
        }
        return key;
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException(
                    "A configuração da verificação não pôde ser serializada."
            );
        }
    }

    public record PrepareCommand(
            UUID learningTargetId,
            String prompt,
            List<OptionCommand> options,
            String correctOptionKey
    ) {}

    public record OptionCommand(String key, String label) {}

    public record StateView(
            RunView run,
            DefinitionView definition,
            InteractionResultEngine.ResultView result,
            int evidenceCount
    ) {
        static StateView empty() {
            return new StateView(null, null, null, 0);
        }
    }

    public record RunView(
            UUID id,
            InteractionRunStatus status,
            int sequence,
            boolean acceptsResponses,
            boolean resultsVisiblePublicly,
            Instant openedAt,
            Instant responsesLockedAt,
            Instant resultsRevealedAt,
            Instant closedAt
    ) {}

    public record DefinitionView(
            UUID id,
            String prompt,
            UUID learningTargetId,
            String learningTargetTitle,
            List<OptionView> options
    ) {}

    public record ParticipantStateView(
            UUID runId,
            InteractionRunStatus status,
            String prompt,
            UUID learningTargetId,
            String learningTargetTitle,
            List<OptionView> options,
            boolean acceptsResponses,
            boolean answered,
            String selectedOptionKey,
            boolean resultsVisiblePublicly,
            String correctOptionKey
    ) {
        static ParticipantStateView empty() {
            return new ParticipantStateView(
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    false,
                    false,
                    null,
                    false,
                    null
            );
        }
    }

    public record ParticipantSignalView(
            UUID runId,
            InteractionRunStatus status,
            boolean acceptsResponses,
            boolean resultsVisiblePublicly
    ) {}

    public record OptionView(String key, String label, int position) {}
}
