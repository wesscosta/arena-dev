package br.com.arenadev.learning.loop;

import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.interaction.InteractionRunRepository;
import br.com.arenadev.interaction.InteractionRunStatus;
import br.com.arenadev.interaction.InteractionResponseRepository;
import br.com.arenadev.learning.LearningEvidence;
import br.com.arenadev.learning.LearningEvidenceOutcome;
import br.com.arenadev.learning.LearningEvidenceService;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LearningCycleService {
    private final LearningCycleRepository cycles;
    private final InteractionRunRepository runs;
    private final ClassSessionRepository sessions;
    private final InteractionResponseRepository responses;
    private final LearningEvidenceService evidence;

    public LearningCycleService(LearningCycleRepository cycles, InteractionRunRepository runs,
                                ClassSessionRepository sessions, InteractionResponseRepository responses,
                                LearningEvidenceService evidence) {
        this.cycles = cycles;
        this.runs = runs;
        this.sessions = sessions;
        this.responses = responses;
        this.evidence = evidence;
    }

    @Transactional(readOnly = true)
    public List<CycleView> list(UUID sessionId) {
        requireSession(sessionId);
        return cycles.findBySessionIdOrderByCreatedAtDesc(sessionId).stream().map(CycleView::from).toList();
    }

    @Transactional
    public CycleView diagnose(UUID sessionId, UUID runId) {
        lockSession(sessionId);
        InteractionRun baseline = runInSession(sessionId, runId);
        requireEvaluatedRun(baseline);
        if (cycles.existsByBaselineId(runId)) {
            throw new IllegalArgumentException("Esta execução já iniciou um ciclo de aprendizagem.");
        }
        return CycleView.from(cycles.save(new LearningCycle(
                baseline.getSession(), baseline.getDefinition().getLearningTarget(), baseline)));
    }

    @Transactional
    public CycleView intervene(UUID sessionId, UUID cycleId, String note) {
        lockSession(sessionId);
        LearningCycle cycle = cycleInSession(sessionId, cycleId);
        cycle.intervene(note);
        return CycleView.from(cycle);
    }

    @Transactional
    public CycleView verify(UUID sessionId, UUID cycleId, UUID followupId) {
        lockSession(sessionId);
        LearningCycle cycle = cycleInSession(sessionId, cycleId);
        InteractionRun followup = runInSession(sessionId, followupId);
        requireEvaluatedRun(followup);
        if (cycles.existsByFollowupId(followupId) || cycles.existsByBaselineId(followupId)) {
            throw new IllegalArgumentException("A execução já está vinculada a outro ciclo.");
        }
        if (followup.getSequence() <= cycle.getBaseline().getSequence()) {
            throw new IllegalArgumentException("A verificação precisa ter ocorrido após o diagnóstico.");
        }
        cycle.verify(followup);
        return CycleView.from(cycle);
    }

    @Transactional(readOnly = true)
    public ComparisonView comparison(UUID sessionId, UUID cycleId) {
        requireSession(sessionId);
        LearningCycle cycle = cycleInSession(sessionId, cycleId);
        if (cycle.getStatus() != LearningCycleStatus.VERIFIED || cycle.getFollowup() == null) {
            throw new IllegalArgumentException("Conclua a segunda verificação para comparar resultados.");
        }
        List<LearningEvidence> before = evidence.evidenceForRun(cycle.getBaseline().getId());
        List<LearningEvidence> after = evidence.evidenceForRun(cycle.getFollowup().getId());
        Map<UUID, LearningEvidenceOutcome> first = comparable(before);
        Map<UUID, LearningEvidenceOutcome> second = comparable(after);
        long correctToCorrect = 0, correctToIncorrect = 0, incorrectToCorrect = 0, incorrectToIncorrect = 0;
        for (var entry : first.entrySet()) {
            LearningEvidenceOutcome later = second.get(entry.getKey());
            if (later == null) continue;
            if (entry.getValue() == LearningEvidenceOutcome.CORRECT) {
                if (later == LearningEvidenceOutcome.CORRECT) correctToCorrect++;
                else correctToIncorrect++;
            } else if (later == LearningEvidenceOutcome.CORRECT) incorrectToCorrect++;
            else incorrectToIncorrect++;
        }
        int paired = (int)(correctToCorrect + correctToIncorrect + incorrectToCorrect + incorrectToIncorrect);
        return new ComparisonView(cycleId, cycle.getTarget().getId(),
                new SampleView(before.size(), first.size()), new SampleView(after.size(), second.size()), paired,
                new TransitionView(correctToCorrect, correctToIncorrect, incorrectToCorrect, incorrectToIncorrect),
                first.size() - paired, second.size() - paired,
                "Variação neste instrumento e entre respostas comparáveis; não demonstra domínio consolidado.");
    }

    private Map<UUID, LearningEvidenceOutcome> comparable(List<LearningEvidence> observations) {
        Map<UUID, LearningEvidenceOutcome> values = new HashMap<>();
        for (LearningEvidence row : observations) {
            if (row.getOutcome() == LearningEvidenceOutcome.CORRECT
                    || row.getOutcome() == LearningEvidenceOutcome.INCORRECT) {
                values.put(row.getParticipant().getId(), row.getOutcome());
            }
        }
        return values;
    }

    private void requireEvaluatedRun(InteractionRun run) {
        if (run.getStatus() != InteractionRunStatus.CLOSED
                || !run.getDefinition().isProducesEvidence()
                || run.getDefinition().getLearningTarget() == null) {
            throw new IllegalArgumentException("A verificação requer interação avaliada, encerrada e vinculada a um objetivo.");
        }
        long answered = responses.countByRunId(run.getId());
        List<LearningEvidence> observations = evidence.evidenceForRun(run.getId());
        if (answered == 0 || observations.size() != answered) {
            throw new IllegalArgumentException("A execução precisa ter respostas e evidências completas antes de participar do ciclo.");
        }
    }

    private void requireSession(UUID sessionId) {
        if (!sessions.existsById(sessionId)) {
            throw new ResourceNotFoundException("Sessão não encontrada.");
        }
    }

    private void lockSession(UUID sessionId) {
        sessions.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
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

    public record SampleView(int responses, int comparable) {}
    public record TransitionView(long correctToCorrect, long correctToIncorrect,
                                 long incorrectToCorrect, long incorrectToIncorrect) {}
    public record ComparisonView(UUID cycleId, UUID learningTargetId,
                                 SampleView baseline, SampleView followup, int paired,
                                 TransitionView transitions, int baselineOnly,
                                 int followupOnly, String disclaimer) {}
}
