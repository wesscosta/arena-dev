package br.com.arenadev.learning.overview;

import br.com.arenadev.learning.loop.LearningCycle;
import br.com.arenadev.learning.loop.LearningCycleRepository;
import br.com.arenadev.learning.loop.LearningCycleService;
import br.com.arenadev.learning.loop.LearningCycleStatus;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Teacher-only read model. All numbers are bounded to one session and observed evidence. */
@Service
public class SessionLearningOverviewService {
    private final ClassSessionRepository sessions;
    private final SessionParticipantRepository participants;
    private final LearningCycleRepository cycles;
    private final LearningCycleService learningCycles;

    public SessionLearningOverviewService(ClassSessionRepository sessions,
                                          SessionParticipantRepository participants,
                                          LearningCycleRepository cycles,
                                          LearningCycleService learningCycles) {
        this.sessions=sessions;
        this.participants=participants;
        this.cycles=cycles;
        this.learningCycles=learningCycles;
    }

    @Transactional(readOnly = true)
    public OverviewView get(UUID sessionId) {
        var session=sessions.findById(sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sessão não encontrada."));
        var roster=participants.findBySessionIdOrderByStudentNameAsc(sessionId);
        long present=roster.stream().filter(p->p.isPresent()).count();
        List<CycleRow> rows=new ArrayList<>();
        // Cycle selection and comparison reuse existing domain invariants; never
        // derive mastery or rebuild scoring from XP, self-confidence, or attendance.
        for(LearningCycle cycle:cycles.findBySessionIdOrderByCreatedAtDesc(sessionId)) {
            var baselineRunId=cycle.getBaseline().getId();
            var status=cycle.getStatus();
            LearningCycleService.ComparisonView comparison=status==LearningCycleStatus.VERIFIED
                    ? learningCycles.comparison(sessionId,cycle.getId()) : null;
            rows.add(new CycleRow(cycle.getId(),cycle.getTarget().getId(),cycle.getTarget().getTitle(),
                    status.name(),cycle.getInterventionType()==null ? null : cycle.getInterventionType().name(),
                    cycle.getInterventionNote(),baselineRunId,cycle.getFollowup()==null ? null : cycle.getFollowup().getId(),
                    comparison));
        }
        return new OverviewView(session.getId(),session.getTitle(),roster.size(),present,
                roster.size()-present,rows.size(),rows.stream().filter(c->c.comparison()!=null).count(),
                rows,"Contagens representam presença marcada e resultados imediatos deste instrumento; "
                  + "não demonstram domínio consolidado, evolução longitudinal ou efeitos causais da intervenção.");
    }

    public record CycleRow(UUID cycleId,UUID learningTargetId,String learningTargetTitle,
                           String status,String interventionType,String interventionNote,
                           UUID baselineRunId,UUID followupRunId,
                           LearningCycleService.ComparisonView comparison) {}
    public record OverviewView(UUID sessionId,String sessionTitle,int enrolledInSession,
                               long presentNow,long absentNow,int cycles,long verifiedCycles,
                               List<CycleRow> rows,String disclaimer) {}
}
