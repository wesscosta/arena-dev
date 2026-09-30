package br.com.arenadev.dynamic;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ParticipantSelectionService {
    private static final double BALANCE_EXPONENT = 1.35;

    public Selection select(
            List<UUID> presentStudentIds,
            Map<String, Integer> drawCounts,
            String lastDrawnStudentId
    ) {
        return select(
                presentStudentIds,
                drawCounts,
                lastDrawnStudentId,
                ThreadLocalRandom.current().nextDouble()
        );
    }

    Selection select(
            List<UUID> presentStudentIds,
            Map<String, Integer> drawCounts,
            String lastDrawnStudentId,
            double randomUnit
    ) {
        if (presentStudentIds == null || presentStudentIds.isEmpty()) {
            throw new IllegalArgumentException("Não há alunos presentes para o sorteio.");
        }
        if (randomUnit < 0.0 || randomUnit >= 1.0) {
            throw new IllegalArgumentException("Valor aleatório deve estar no intervalo [0, 1).");
        }

        Map<String, Integer> counts = new HashMap<>(
                drawCounts == null ? Map.of() : drawCounts
        );

        List<UUID> eligible = presentStudentIds.size() > 1 && lastDrawnStudentId != null
                ? presentStudentIds.stream()
                    .filter(id -> !id.toString().equals(lastDrawnStudentId))
                    .toList()
                : presentStudentIds;

        if (eligible.isEmpty()) {
            eligible = presentStudentIds;
        }

        List<WeightedCandidate> weighted = eligible.stream()
                .map(id -> new WeightedCandidate(
                        id,
                        1.0 / Math.pow(counts.getOrDefault(id.toString(), 0) + 1.0, BALANCE_EXPONENT)
                ))
                .toList();

        double totalWeight = weighted.stream()
                .mapToDouble(WeightedCandidate::weight)
                .sum();

        double cursor = randomUnit * totalWeight;
        UUID winner = weighted.getLast().studentId();

        for (WeightedCandidate candidate : weighted) {
            cursor -= candidate.weight();
            if (cursor <= 0) {
                winner = candidate.studentId();
                break;
            }
        }

        counts.put(winner.toString(), counts.getOrDefault(winner.toString(), 0) + 1);

        return new Selection(winner, Map.copyOf(counts));
    }

    public record Selection(UUID studentId, Map<String, Integer> drawCounts) {
    }

    private record WeightedCandidate(UUID studentId, double weight) {
    }
}
