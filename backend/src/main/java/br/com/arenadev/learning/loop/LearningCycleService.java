package br.com.arenadev.learning.loop;

import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.interaction.InteractionRunRepository;
import br.com.arenadev.interaction.InteractionRunStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class LearningCycleService {
    private final LearningCycleRepository cycles;
    private final InteractionRunRepository runs;

    public LearningCycleService(LearningCycleRepository cycles, InteractionRunRepository runs) {
        this.cycles = cycles;
        this.runs = runs;
    }

    @Transactional(readOnly = true)
    public List<CycleView> list(UUID sessionId) {
        return cycles.findBySessionIdOrderByCreatedAtDesc(sessionId).stream().map(CycleView::from).toList();
    }

    @Transactional
    public CycleView diagnose(UUID sessionId, UUID runId) {
        InteractionRun baseline = runInSession(sessionId, runId);
        if (baseline.getStatus() != InteractionRunStatus.CLOSED
                || !baseline.getDefinition().isProducesEvidence()
                || baseline.getDefinition().getLearningTarget() == null) {
            throw new IllegalArgumentException("Diagnóstico requer interação avaliada e encerrada com objetivo de aprendizagem.");
        }
        if (cycles.existsByBaselineId(runId)) {
            throw new IllegalArgumentException("Esta execução já iniciou um ciclo de aprendizagem.");
        }
        return CycleView.from(cycles.save(new LearningCycle(
                baseline.getSession(), baseline.getDefinition().getLearningTarget(), baseline)));
    }

    @Transactional
    public CycleView intervene(UUID sessionId, UUID cycleId, String note) {
        LearningCycle cycle = cycleInSession(sessionId, cycleId);
        cycle.intervene(note);
        return CycleView.from(cycle);
    }

    @Transactional
    public CycleView verify(UUID sessionId, UUID cycleId, UUID followupId) {
        LearningCycle cycle = cycleInSession(sessionId, cycleId);
        InteractionRun followup = runInSession(sessionId, followupId);
        if (followup.getStatus() != InteractionRunStatus.CLOSED) {
            throw new IllegalArgumentException("A nova verificação precisa estar encerrada.");
        }
        if (cycles.existsByFollowupId(followupId)) {
            throw new IllegalArgumentException("A execução já foi utilizada em outra verificação.");
        }
        cycle.verify(followup);
        return CycleView.from(cycle);
    }

    private InteractionRun runInSession(UUID sessionId, UUID runId) {
        InteractionRun run = runs.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Interação não encontrada."));
        if (!run.getSession().getId().equals(sessionId)) {
            throw new ResourceNotFoundException("Interação não encontrada nesta sessão.");
        }
        return run;
    }

    private LearningCycle cycleInSession(UUID sessionId, UUID cycleId) {
        LearningCycle cycle = cycles.findById(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Ciclo de aprendizagem não encontrado."));
        if (!cycle.getSession().getId().equals(sessionId)) {
            throw new ResourceNotFoundException("Ciclo de aprendizagem não encontrado nesta sessão.");
        }
        return cycle;
    }

    public record CycleView(UUID id, UUID sessionId, UUID learningTargetId,
                            UUID baselineRunId, UUID followupRunId,
                            LearningCycleStatus status, String interventionNote) {
        static CycleView from(LearningCycle cycle) {
            return new CycleView(cycle.getId(), cycle.getSession().getId(), cycle.getTarget().getId(),
                    cycle.getBaseline().getId(),
                    cycle.getFollowup() == null ? null : cycle.getFollowup().getId(),
                    cycle.getStatus(), cycle.getInterventionNote());
        }
    }
}
