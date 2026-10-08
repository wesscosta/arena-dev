package br.com.arenadev.interaction;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InteractionCutoverGateService {
    private final InteractionShadowObservationRepository repository;
    private final boolean quizShadowEnabled;
    private final boolean pollShadowEnabled;
    private final boolean wordCloudShadowEnabled;
    private final int minimumTerminalRounds;
    private final int sampleSize;

    public InteractionCutoverGateService(
            InteractionShadowObservationRepository repository,
            @Value("${app.learning-core.quiz-shadow-enabled:false}") boolean quizShadowEnabled,
            @Value("${app.learning-core.poll-shadow-enabled:false}") boolean pollShadowEnabled,
            @Value("${app.learning-core.word-cloud-shadow-enabled:false}") boolean wordCloudShadowEnabled,
            @Value("${app.learning-core.cutover.minimum-terminal-rounds:3}") int minimumTerminalRounds,
            @Value("${app.learning-core.cutover.sample-size:200}") int sampleSize
    ) {
        this.repository = repository;
        this.quizShadowEnabled = quizShadowEnabled;
        this.pollShadowEnabled = pollShadowEnabled;
        this.wordCloudShadowEnabled = wordCloudShadowEnabled;
        this.minimumTerminalRounds = Math.max(1, minimumTerminalRounds);
        this.sampleSize = Math.max(this.minimumTerminalRounds, sampleSize);
    }

    @Transactional(readOnly = true)
    public GateReport report() {
        EnumMap<InteractionShadowType, TypeGate> types =
                new EnumMap<>(InteractionShadowType.class);

        for (InteractionShadowType type : InteractionShadowType.values()) {
            types.put(type, evaluate(type));
        }

        boolean logicalCutoverReady = types.values().stream()
                .allMatch(TypeGate::readyForCutover);

        List<String> legacyRemovalBlockers = new ArrayList<>();
        if (!logicalCutoverReady) {
            legacyRemovalBlockers.add(
                    "O runtime legado continua autoridade até todos os shadows passarem o gate de cutover."
            );
        }
        legacyRemovalBlockers.add(
                "A remoção física das tabelas legadas exige ao menos uma janela de release/rollback após o cutover lógico."
        );

        return new GateReport(
                Map.copyOf(types),
                logicalCutoverReady,
                false,
                List.copyOf(legacyRemovalBlockers)
        );
    }

    private TypeGate evaluate(InteractionShadowType type) {
        boolean enabled = shadowEnabled(type);
        List<InteractionShadowObservation> recent =
                repository.findByInteractionTypeOrderByObservedAtDesc(
                        type,
                        PageRequest.of(0, sampleSize)
                );

        LinkedHashMap<UUID, InteractionShadowObservation> latestByRound =
                new LinkedHashMap<>();
        for (InteractionShadowObservation observation : recent) {
            latestByRound.putIfAbsent(
                    observation.getLegacyRoundId(),
                    observation
            );
        }

        long equivalentTerminalRounds = latestByRound.values().stream()
                .filter(InteractionShadowObservation::terminal)
                .filter(observation ->
                        observation.getStatus()
                                == InteractionShadowObservationStatus.EQUIVALENT)
                .count();

        List<UUID> unresolvedRounds = latestByRound.values().stream()
                .filter(observation ->
                        observation.getStatus()
                                != InteractionShadowObservationStatus.EQUIVALENT)
                .map(InteractionShadowObservation::getLegacyRoundId)
                .toList();

        List<String> blockers = new ArrayList<>();
        if (!enabled) {
            blockers.add("Shadow desabilitado no runtime.");
        }
        if (equivalentTerminalRounds < minimumTerminalRounds) {
            blockers.add(
                    "Amostra terminal insuficiente: "
                            + equivalentTerminalRounds
                            + "/"
                            + minimumTerminalRounds
                            + " rodadas fechadas equivalentes."
            );
        }
        if (!unresolvedRounds.isEmpty()) {
            blockers.add(
                    "Existem "
                            + unresolvedRounds.size()
                            + " rodadas com mismatch/sync error ainda não resolvido."
            );
        }

        boolean ready = enabled
                && equivalentTerminalRounds >= minimumTerminalRounds
                && unresolvedRounds.isEmpty();

        return new TypeGate(
                type,
                enabled,
                recent.size(),
                latestByRound.size(),
                equivalentTerminalRounds,
                List.copyOf(unresolvedRounds),
                ready,
                List.copyOf(blockers)
        );
    }

    private boolean shadowEnabled(InteractionShadowType type) {
        return switch (type) {
            case QUIZ -> quizShadowEnabled;
            case POLL -> pollShadowEnabled;
            case WORD_CLOUD -> wordCloudShadowEnabled;
        };
    }

    public record TypeGate(
            InteractionShadowType type,
            boolean shadowEnabled,
            int observationsSampled,
            int distinctRoundsSampled,
            long equivalentTerminalRounds,
            List<UUID> unresolvedRounds,
            boolean readyForCutover,
            List<String> blockers
    ) {
    }

    public record GateReport(
            Map<InteractionShadowType, TypeGate> types,
            boolean logicalCutoverReady,
            boolean physicalLegacyRemovalReady,
            List<String> legacyRemovalBlockers
    ) {
    }
}
