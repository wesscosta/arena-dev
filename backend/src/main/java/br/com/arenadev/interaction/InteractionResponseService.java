package br.com.arenadev.interaction;

import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
public class InteractionResponseService {
    private final InteractionRunRepository runRepository;
    private final InteractionResponseRepository responseRepository;
    private final SessionParticipantRepository participantRepository;
    private final InteractionResponseValidator responseValidator;
    private final Clock clock;

    @Autowired
    public InteractionResponseService(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            SessionParticipantRepository participantRepository,
            InteractionResponseValidator responseValidator
    ) {
        this(
                runRepository,
                responseRepository,
                participantRepository,
                responseValidator,
                Clock.systemUTC()
        );
    }

    InteractionResponseService(
            InteractionRunRepository runRepository,
            InteractionResponseRepository responseRepository,
            SessionParticipantRepository participantRepository,
            InteractionResponseValidator responseValidator,
            Clock clock
    ) {
        this.runRepository = runRepository;
        this.responseRepository = responseRepository;
        this.participantRepository = participantRepository;
        this.responseValidator = responseValidator;
        this.clock = clock;
    }

    @Transactional
    public InteractionResponse submit(UUID runId, UUID participantId, String responseJson) {
        InteractionRun run = runRepository.findByIdForUpdate(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));

        if (!run.acceptsResponses()) {
            throw new IllegalArgumentException("A interação não está aceitando respostas.");
        }

        responseValidator.validate(run.getDefinition(), responseJson);

        UUID sessionId = run.getSession().getId();
        SessionParticipant participant = participantRepository
                .findByIdAndSessionIdForUpdate(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participante não encontrado nesta sessão."
                ));

        InteractionResponse existing = responseRepository
                .findByRunIdAndParticipantId(runId, participantId)
                .orElse(null);

        if (existing == null) {
            return responseRepository.save(
                    new InteractionResponse(run, participant, responseJson, Instant.now(clock))
            );
        }

        if (existing.samePayload(responseJson)) {
            return existing;
        }

        InteractionSubmissionPolicy policy = run.getDefinition().getSubmissionPolicy();
        if (policy == InteractionSubmissionPolicy.ONE_SUBMISSION) {
            throw new IllegalArgumentException("Sua resposta já foi registrada nesta interação.");
        }

        existing.updatePayload(responseJson, Instant.now(clock));
        return existing;
    }

    @Transactional(readOnly = true)
    public InteractionResponse findParticipantResponse(UUID runId, UUID participantId) {
        return responseRepository.findByRunIdAndParticipantId(runId, participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Resposta não encontrada."));
    }
}
