package br.com.arenadev.interaction;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class InteractionShadowObservationService {
    private final InteractionShadowObservationRepository repository;
    private final InteractionRunRepository runRepository;
    private final JsonMapper json;

    public InteractionShadowObservationService(
            InteractionShadowObservationRepository repository,
            InteractionRunRepository runRepository,
            JsonMapper json
    ) {
        this.repository = repository;
        this.runRepository = runRepository;
        this.json = json;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            InteractionShadowType type,
            UUID legacyRoundId,
            UUID interactionRunId,
            boolean equivalent,
            List<String> mismatches,
            long legacyResponseCount
    ) {
        InteractionRunStatus runStatus = interactionRunId == null
                ? null
                : runRepository.findById(interactionRunId)
                        .map(InteractionRun::getStatus)
                        .orElse(null);

        repository.save(new InteractionShadowObservation(
                type,
                legacyRoundId,
                interactionRunId,
                runStatus,
                equivalent
                        ? InteractionShadowObservationStatus.EQUIVALENT
                        : InteractionShadowObservationStatus.MISMATCH,
                writeJson(mismatches == null ? List.of() : mismatches),
                legacyResponseCount,
                Instant.now()
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(
            InteractionShadowType type,
            UUID legacyRoundId,
            RuntimeException error
    ) {
        String code = error == null
                ? "sync-error:RuntimeException"
                : "sync-error:" + error.getClass().getSimpleName();

        repository.save(new InteractionShadowObservation(
                type,
                legacyRoundId,
                null,
                null,
                InteractionShadowObservationStatus.SYNC_ERROR,
                writeJson(List.of(code)),
                null,
                Instant.now()
        ));
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao serializar observação de shadow.", error);
        }
    }
}
