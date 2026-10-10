package br.com.arenadev.draw;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.dynamic.ParticipantSelectionService;
import br.com.arenadev.scoring.*;
import br.com.arenadev.sessionevent.*;
import br.com.arenadev.session.*;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/** Authoritative teacher-only selection/participation. Not an assessment or mastery engine. */
@Service
public class DrawService {
    private final ClassSessionRepository sessions;
    private final SessionParticipantRepository participants;
    private final DrawSettingsRepository settingsRepository;
    private final DrawAttemptRepository attempts;
    private final DrawAttemptScoreLinkRepository scoreLinks;
    private final ScoreEventService scores;
    private final ScoreEventRepository scoreEvents;
    private final ParticipantSelectionService selector;
    private final LiveStageService stage;
    private final DrawProtocolGuard protocolGuard;
    private final SessionEventService events;

    public DrawService(ClassSessionRepository sessions, SessionParticipantRepository participants,
                       DrawSettingsRepository settingsRepository, DrawAttemptRepository attempts,
                       DrawAttemptScoreLinkRepository scoreLinks, ScoreEventService scores,
                       ScoreEventRepository scoreEvents, ParticipantSelectionService selector,
                       LiveStageService stage, DrawProtocolGuard protocolGuard, SessionEventService events) {
        this.sessions=sessions; this.participants=participants; this.settingsRepository=settingsRepository;
        this.attempts=attempts; this.scoreLinks=scoreLinks; this.scores=scores;
        this.scoreEvents=scoreEvents; this.selector=selector; this.stage=stage;
        this.protocolGuard=protocolGuard; this.events=events;
    }

    @Transactional(readOnly=true)
    public DrawStateView state(UUID sessionId) {
        requireSession(sessionId);
        protocolGuard.requireModernAllowed(sessionId);
        DrawSettings settings=settingsRepository.findById(sessionId).orElse(null);
        List<DrawAttempt> all=attempts.findBySessionIdOrderBySequenceAsc(sessionId);
        return snapshot(sessionId, settings, all);
    }

    @Transactional
    public DrawStateView setPolicy(UUID sessionId, DrawPolicy policy) {
        ClassSession session=activeSessionForUpdate(sessionId);
        if(policy==null)throw new IllegalArgumentException("Critério de seleção obrigatório.");
        if (attempts.findBySessionIdAndStatus(sessionId,DrawOutcome.PENDING).isPresent()) {
            throw new DrawConflictException("Resolva o participante atual antes de trocar o critério.");
        }
        protocolGuard.requireModernAllowed(sessionId);
        DrawSettings settings=getOrCreate(session);
        DrawPolicy previousPolicy = settings.getSelectionPolicy();
        settings.changePolicy(policy);
        if (previousPolicy != policy) {
            events.record(session, SessionEventType.DRAW_POLICY_CHANGED, SessionEventActor.TEACHER,
                    "Critério de sorteio alterado", Map.of("policy", policy.name()));
        }
        settingsRepository.save(settings);
        return snapshot(sessionId,settings,attempts.findBySessionIdOrderBySequenceAsc(sessionId));
    }

    @Transactional
    public DrawStateView nextRound(UUID sessionId, UUID requestId) {
        ClassSession session=activeSessionForUpdate(sessionId);
        requireId(requestId);
        protocolGuard.requireModernAllowed(sessionId);
        DrawSettings settings=getOrCreate(session);
        if(requestId.equals(settings.getLastRoundRequestId()))return snapshot(sessionId,settings,all(sessionId));
        List<DrawAttempt> all=all(sessionId);
        if(all.stream().anyMatch(a->a.getStatus()==DrawOutcome.PENDING)) {
            throw new DrawConflictException("Resolva o participante antes de iniciar outra rodada.");
        }
        if(settings.getSelectionPolicy()!=DrawPolicy.ROUND_ROBIN_SHUFFLED)
            throw new IllegalArgumentException("Nova rodada é utilizada somente no sorteio sem repetição.");
        Set<UUID> called=calledInRound(all,settings.getRoundNumber());
        List<UUID> present=presentIds(sessionId);
        if(present.isEmpty() || !called.containsAll(present))
            throw new DrawConflictException("A rodada atual ainda tem participantes elegíveis.");
        settings.nextRound(requestId);
        events.record(session, SessionEventType.DRAW_ROUND_STARTED, SessionEventActor.TEACHER,
                "Nova rodada de sorteio iniciada", Map.of("round", settings.getRoundNumber()));
        return snapshot(sessionId,settings,all);
    }

    @Transactional
    public DrawAttemptView select(UUID sessionId, UUID requestId) {
        ClassSession session=activeSessionForUpdate(sessionId);
        requireId(requestId);
        Optional<DrawAttempt> previous=attempts.findBySessionIdAndSelectRequestId(sessionId,requestId);
        if(previous.isPresent())return view(previous.get());
        if(attempts.findBySessionIdAndStatus(sessionId,DrawOutcome.PENDING).isPresent())
            throw new DrawConflictException("Resolva o sorteio atual antes de selecionar novamente.");
        protocolGuard.requireModernAllowed(sessionId);
        DrawSettings settings=getOrCreate(session);
        List<UUID> present=presentIds(sessionId);
        if(present.isEmpty())throw new IllegalArgumentException("Nenhum participante presente está disponível.");
        List<DrawAttempt> previousAttempts=all(sessionId);
        UUID studentId;
        if(settings.getSelectionPolicy()==DrawPolicy.ROUND_ROBIN_SHUFFLED) {
            Set<UUID> called=calledInRound(previousAttempts,settings.getRoundNumber());
            List<UUID> eligible=present.stream().filter(id->!called.contains(id)).toList();
            if(eligible.isEmpty())
                throw new DrawConflictException("Todos os presentes já foram chamados. Inicie a próxima rodada.");
            studentId=pickUniform(eligible,ThreadLocalRandom.current().nextDouble());
        } else {
            Map<String,Integer> counts=new HashMap<>();
            for(DrawAttempt row:previousAttempts)
                if(row.getStatus()!=DrawOutcome.VOIDED)counts.merge(row.getStudent().getId().toString(),1,Integer::sum);
            String last=previousAttempts.stream().filter(a->a.getStatus()!=DrawOutcome.VOIDED)
                    .reduce((a,b)->b).map(a->a.getStudent().getId().toString()).orElse(null);
            studentId=selector.select(present,counts,last).studentId();
        }
        Student student=participants.findBySessionIdOrderByStudentNameAsc(sessionId).stream()
                .filter(p->p.getStudent().getId().equals(studentId)).findFirst()
                .orElseThrow().getStudent();
        int sequence=previousAttempts.size()+1;
        DrawAttempt attempt=attempts.save(new DrawAttempt(session,student,sequence,
                settings.getRoundNumber(),settings.getSelectionPolicy(),requestId));
        settings.touch();
        stage.showDraw(sessionId,studentId);
        events.record(session, SessionEventType.DRAW_SELECTED, SessionEventActor.TEACHER,
                "Aluno selecionado; participação aguardando confirmação",
                Map.of("attemptId", attempt.getId().toString(), "round", attempt.getRoundNumber(),
                        "policy", attempt.getSelectionPolicy().name()));
        return view(attempt);
    }

    @Transactional
    public DrawAttemptView resolve(UUID sessionId, UUID attemptId, UUID requestId,
                                   DrawOutcome outcome, ScoreCommand score) {
        ClassSession session=activeSessionForUpdate(sessionId);
        requireId(requestId);
        DrawAttempt attempt=attempts.findByIdAndSessionId(attemptId,sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sorteio não encontrado nesta sessão."));
        if(outcome==null || outcome==DrawOutcome.PENDING || (outcome!=DrawOutcome.CONFIRMED && score!=null))
            throw new IllegalArgumentException("Desfecho inválido: XP só pode acompanhar confirmação.");
        if(score!=null && (score.points()<1 || score.points()>100 || score.category()==null
                || score.reason()==null || score.reason().isBlank() || score.reason().length()>300))
            throw new IllegalArgumentException("Pontuação deve ser de 1 a 100 com categoria e motivo.");
        String digest=fingerprint(outcome,score);
        if(attempt.getStatus()!=DrawOutcome.PENDING) {
            if(requestId.equals(attempt.getResolutionRequestId())
                    && digest.equals(attempt.getResolutionFingerprint())) return view(attempt);
            throw new DrawConflictException("Sorteio já resolvido ou comando diferente do original.");
        }
        attempt.resolve(requestId,outcome,digest);
        if(score!=null) {
            var event=scores.create(new ScoreEventService.CreateScoreEvent(session.getClassroom().getId(),
                    attempt.getStudent().getId(),sessionId,score.points(),score.category(),
                    score.reason(),ScoreSource.ARENA,null,null));
            scoreLinks.save(new DrawAttemptScoreLink(attempt,scoreEvents.getReferenceById(event.id())));
        }
        settingsRepository.findById(sessionId).ifPresent(DrawSettings::touch);
        events.record(session, SessionEventType.DRAW_RESOLVED, SessionEventActor.TEACHER,
                "Sorteio encerrado: " + outcome.name(),
                Map.of("attemptId", attempt.getId().toString(), "outcome", outcome.name(),
                        "pointsGranted", score == null ? 0 : score.points()));
        return view(attempt);
    }

    private static String fingerprint(DrawOutcome outcome, ScoreCommand score) {
        String canonical=outcome.name()+"|"+(score==null ? "none" :
                score.points()+"|"+score.category()+"|"+score.reason());
        try {
            byte[] bytes=MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch(NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }

    static UUID pickUniform(List<UUID> candidates,double randomUnit) {
        if(candidates==null || candidates.isEmpty() || randomUnit<0 || randomUnit>=1)
            throw new IllegalArgumentException("Não há candidatos elegíveis ou valor aleatório inválido.");
        return candidates.get((int)(randomUnit*candidates.size()));
    }

    private List<DrawAttempt> all(UUID sessionId){return attempts.findBySessionIdOrderBySequenceAsc(sessionId);}
    private Set<UUID> calledInRound(List<DrawAttempt> history,int round) {
        return history.stream().filter(a->a.getRoundNumber()==round)
                .filter(a->a.getStatus()==DrawOutcome.CONFIRMED || a.getStatus()==DrawOutcome.PASSED)
                .map(a->a.getStudent().getId()).collect(Collectors.toSet());
    }
    private List<UUID> presentIds(UUID sessionId) {
        return participants.findBySessionIdOrderByStudentNameAsc(sessionId).stream()
                .filter(SessionParticipant::isPresent).map(p->p.getStudent().getId()).toList();
    }
    private DrawSettings getOrCreate(ClassSession session) {
        return settingsRepository.findById(session.getId()).orElseGet(()->
                settingsRepository.save(new DrawSettings(session)));
    }
    private ClassSession activeSessionForUpdate(UUID sessionId) {
        ClassSession session=sessions.findByIdForUpdate(sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sessão não encontrada."));
        if(session.getStatus()!=SessionStatus.ACTIVE)
            throw new IllegalArgumentException("Sessão não está ativa.");
        return session;
    }
    private void requireSession(UUID sessionId) {
        if(!sessions.existsById(sessionId))throw new ResourceNotFoundException("Sessão não encontrada.");
    }
    private static void requireId(UUID id){if(id==null)throw new IllegalArgumentException("Identificador de comando obrigatório.");}
    private DrawStateView snapshot(UUID sessionId,DrawSettings setting,List<DrawAttempt> all) {
        DrawPolicy policy=setting==null?DrawPolicy.ROUND_ROBIN_SHUFFLED:setting.getSelectionPolicy();
        int round=setting==null?1:setting.getRoundNumber();
        Set<UUID> called=calledInRound(all,round);
        int confirmed=(int)all.stream().filter(a->a.getStatus()==DrawOutcome.CONFIRMED).count();
        int passed=(int)all.stream().filter(a->a.getStatus()==DrawOutcome.PASSED).count();
        int voided=(int)all.stream().filter(a->a.getStatus()==DrawOutcome.VOIDED).count();
        List<UUID> present=presentIds(sessionId);
        long eligible=present.stream().filter(id->!called.contains(id)).count();
        DrawAttempt current=all.stream().filter(a->a.getStatus()==DrawOutcome.PENDING).findFirst().orElse(null);
        return new DrawStateView(sessionId,policy,round,setting==null?0:setting.getRevision(),
                called.size(),confirmed,passed,voided,present.size(),(int)eligible,
                policy==DrawPolicy.ROUND_ROBIN_SHUFFLED && eligible==0 && !present.isEmpty() && current==null,
                current==null?null:view(current),
                all.stream().map(this::view).toList());
    }
    private DrawAttemptView view(DrawAttempt a) {
        UUID scoreId=scoreLinks.findById(a.getId()).map(DrawAttemptScoreLink::getScoreEventId).orElse(null);
        return new DrawAttemptView(a.getId(),a.getSession().getId(),a.getStudent().getId(),
                a.getStudent().getName(),a.getSequence(),a.getRoundNumber(),a.getSelectionPolicy(),
                a.getStatus(),scoreId,scoreId!=null && scoreEvents.existsByReversalOfId(scoreId),
                a.getSelectedAt(),a.getResolvedAt());
    }
    public record ScoreCommand(int points,ScoreCategory category,String reason) {}
    public record DrawAttemptView(UUID attemptId,UUID sessionId,UUID studentId,String studentName,
                                  int sequence,int roundNumber,DrawPolicy policy,DrawOutcome status,
                                  UUID scoreEventId,boolean scoreReversed,
                                  java.time.Instant selectedAt,java.time.Instant resolvedAt) {}
    public record DrawStateView(UUID sessionId,DrawPolicy policy,int roundNumber,long revision,
                                int calledUniqueCount,int confirmedCount,int passedCount,int voidedCount,
                                int presentCount,int eligibleCurrentRoundCount,boolean canStartNextRound,
                                DrawAttemptView currentAttempt,List<DrawAttemptView> history) {}
}
