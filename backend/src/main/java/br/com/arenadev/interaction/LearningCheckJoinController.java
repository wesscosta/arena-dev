package br.com.arenadev.interaction;

import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/join/{code}/learning-check")
public class LearningCheckJoinController {
    private final SessionJoinService joinService;
    private final LearningCheckService checkService;
    private final InteractionResponseService responseService;
    private final JsonMapper json;

    public LearningCheckJoinController(
            SessionJoinService joinService,
            LearningCheckService checkService,
            InteractionResponseService responseService,
            JsonMapper json
    ) {
        this.joinService = joinService;
        this.checkService = checkService;
        this.responseService = responseService;
        this.json = json;
    }

    @GetMapping
    public ParticipantStateView current(
            @PathVariable String code,
            @RequestParam @NotBlank String token
    ) {
        var session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(
                session.sessionId(),
                token
        );
        LearningCheckService.StateView state = checkService.current(session.sessionId());
        return participantState(state, participant.getId());
    }

    @PostMapping("/{runId}/answer")
    public ParticipantStateView answer(
            @PathVariable String code,
            @PathVariable UUID runId,
            @Valid @RequestBody AnswerRequest request
    ) {
        var session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(
                session.sessionId(),
                request.token()
        );

        LearningCheckService.StateView state = checkService.state(
                session.sessionId(),
                runId
        );
        if (state.run() == null || !state.run().acceptsResponses()) {
            throw new IllegalArgumentException(
                    "A verificação não está aceitando respostas."
            );
        }

        responseService.submit(
                runId,
                participant.getId(),
                responseJson(request.optionKey())
        );
        return participantState(
                checkService.state(session.sessionId(), runId),
                participant.getId()
        );
    }

    private ParticipantStateView participantState(
            LearningCheckService.StateView state,
            UUID participantId
    ) {
        if (state == null || state.run() == null) {
            return ParticipantStateView.empty();
        }
        InteractionResponse response = responseService
                .findParticipantResponseOptional(state.run().id(), participantId)
                .orElse(null);
        return ParticipantStateView.from(
                state,
                response != null,
                response == null ? null : selectedOptionKey(response.getResponseJson())
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

    private String responseJson(String rawOptionKey) {
        if (rawOptionKey == null || rawOptionKey.isBlank()) {
            throw new IllegalArgumentException("Selecione uma alternativa.");
        }
        try {
            return json.writeValueAsString(Map.of(
                    "selectedOptionKeys",
                    List.of(rawOptionKey.trim())
            ));
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("A resposta não pôde ser serializada.");
        }
    }

    public record AnswerRequest(
            @NotBlank String token,
            @NotNull @NotBlank @Size(max = 100) String optionKey
    ) {}

    public record ParticipantStateView(
            UUID runId,
            String prompt,
            UUID learningTargetId,
            String learningTargetTitle,
            java.util.List<LearningCheckService.OptionView> options,
            boolean acceptsResponses,
            boolean answered,
            String selectedOptionKey,
            boolean resultsVisiblePublicly
    ) {
        static ParticipantStateView empty() {
            return new ParticipantStateView(
                    null,
                    null,
                    null,
                    null,
                    java.util.List.of(),
                    false,
                    false,
                    null,
                    false
            );
        }

        static ParticipantStateView from(
                LearningCheckService.StateView state,
                boolean answered,
                String selectedOptionKey
        ) {
            if (state == null
                    || state.run() == null
                    || state.definition() == null
                    || state.run().status() != InteractionRunStatus.ACTIVE) {
                return empty();
            }
            return new ParticipantStateView(
                    state.run().id(),
                    state.definition().prompt(),
                    state.definition().learningTargetId(),
                    state.definition().learningTargetTitle(),
                    state.definition().options(),
                    state.run().acceptsResponses(),
                    answered,
                    selectedOptionKey,
                    state.run().resultsVisiblePublicly()
            );
        }
    }
}
