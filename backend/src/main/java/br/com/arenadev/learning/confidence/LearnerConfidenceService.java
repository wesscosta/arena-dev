package br.com.arenadev.learning.confidence;

import br.com.arenadev.interaction.InteractionResponseRepository;
import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.interaction.InteractionRunRepository;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

@Service
public class LearnerConfidenceService {
    private final JdbcTemplate jdbc;
    private final InteractionRunRepository runs;
    private final InteractionResponseRepository responses;
    private final SessionParticipantRepository participants;
    private final ClassSessionRepository sessions;

    public LearnerConfidenceService(JdbcTemplate jdbc,InteractionRunRepository runs,
                                    InteractionResponseRepository responses,
                                    SessionParticipantRepository participants,ClassSessionRepository sessions) {
        this.jdbc=jdbc;
        this.runs=runs;
        this.responses=responses;
        this.participants=participants;
        this.sessions=sessions;
    }

    public enum Level {LOW, MEDIUM, HIGH, SKIPPED}

    /** A validated participant token is mandatory at the controller boundary. */
    @Transactional(readOnly=true)
    public Level own(UUID sessionId,UUID runId,UUID participantId) {
        ensureRun(runId,sessionId);
        ensureParticipant(sessionId,participantId);
        return jdbc.query("select level from learner_confidence where run_id=? and participant_id=?",
                rs->rs.next()?Level.valueOf(rs.getString(1)):null,runId,participantId);
    }

    @Transactional
    public Level record(UUID sessionId,UUID runId,UUID participantId,Level level) {
        if(level==null) throw new IllegalArgumentException("Escolha uma opção ou prefira não informar.");
        InteractionRun run=runs.findByIdForUpdate(runId)
                .orElseThrow(()->new ResourceNotFoundException("Verificação não encontrada."));
        if(!run.getSession().getId().equals(sessionId) || !run.getDefinition().isProducesEvidence()) {
            throw new ResourceNotFoundException("Verificação não encontrada nesta sessão.");
        }
        // Serialize with teacher's lock/reveal/close operation: after the teacher closes
        // responses, subjective perceptions are immutable just like the actual answer.
        if(!run.acceptsResponses() || run.resultsVisiblePublicly()) {
            throw new IllegalArgumentException("Autopercepção só pode ser registrada enquanto a verificação está aberta e sem correção revelada.");
        }
        ensureParticipant(sessionId,participantId);
        if(responses.findByRunIdAndParticipantId(runId,participantId).isEmpty()) {
            throw new IllegalArgumentException("Responda à verificação antes de registrar sua percepção.");
        }
        jdbc.update("""
            insert into learner_confidence(run_id,participant_id,level,recorded_at,updated_at)
            values(?,?,?,now(),now()) on conflict(run_id,participant_id) do update
            set level=excluded.level,
                updated_at=case when learner_confidence.level=excluded.level
                then learner_confidence.updated_at else now() end
            """,runId,participantId,level.name());
        return level;
    }

    /** Only aggregates after response lock; values are suppressed below privacy threshold. */
    @Transactional(readOnly=true)
    public Summary summary(UUID sessionId,UUID runId) {
        InteractionRun run=ensureRun(runId,sessionId);
        if(run.acceptsResponses() || run.getStatus()==br.com.arenadev.interaction.InteractionRunStatus.CREATED) {
            return Summary.suppressed("Aguarde o bloqueio das respostas.");
        }
        Long total=jdbc.queryForObject("select count(*) from learner_confidence where run_id=?",
                Long.class,runId);
        if(total==null || total<3) return Summary.suppressed("Distribuição indisponível com menos de três declarações.");
        EnumMap<Level,Long> counts=new EnumMap<>(Level.class);
        for(Level value:Level.values()) counts.put(value,0L);
        jdbc.query("select level,count(*) as amount from learner_confidence where run_id=? group by level",
                rs->{counts.put(Level.valueOf(rs.getString("level")),rs.getLong("amount"));},runId);
        return new Summary(true,total,counts,null);
    }

    private InteractionRun ensureRun(UUID runId,UUID sessionId) {
        sessions.findById(sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sessão não encontrada."));
        InteractionRun run=runs.findById(runId)
                .orElseThrow(()->new ResourceNotFoundException("Verificação não encontrada."));
        if(!run.getSession().getId().equals(sessionId) || !run.getDefinition().isProducesEvidence()) {
            throw new ResourceNotFoundException("Verificação não encontrada nesta sessão.");
        }
        return run;
    }

    private void ensureParticipant(UUID sessionId,UUID participantId) {
        participants.findByIdAndSessionId(participantId,sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Participante não encontrado nesta sessão."));
    }

    public record Summary(boolean available,long declarations,Map<Level,Long> counts,String reason) {
        static Summary suppressed(String reason) {return new Summary(false,0,Map.of(),reason);}
    }
}
