package br.com.arenadev.learning.clinic;

import br.com.arenadev.interaction.*;
import br.com.arenadev.learning.LearningEvidenceService;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.sessionevent.*;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class LearningErrorClinicService {
    private final ClassSessionRepository sessions;
    private final InteractionRunRepository runs;
    private final InteractionResponseRepository responses;
    private final LearningEvidenceService evidence;
    private final InteractionResultEngine engine;
    private final LearningErrorNoteRepository notes;
    private final SessionEventService events;
    private final JsonMapper json;

    public LearningErrorClinicService(ClassSessionRepository sessions, InteractionRunRepository runs,
            InteractionResponseRepository responses, LearningEvidenceService evidence,
            InteractionResultEngine engine, LearningErrorNoteRepository notes,
            SessionEventService events, JsonMapper json) {
        this.sessions=sessions; this.runs=runs; this.responses=responses;
        this.evidence=evidence; this.engine=engine; this.notes=notes;
        this.events=events; this.json=json;
    }

    @Transactional(readOnly = true)
    public ClinicView read(UUID sessionId, UUID runId) {
        if (!sessions.existsById(sessionId)) throw new ResourceNotFoundException("Sessão não encontrada.");
        InteractionRun run=requireRun(sessionId,runId);
        requireCompleted(run);
        return view(run);
    }

    @Transactional
    public ClinicView annotate(UUID sessionId, UUID runId, UUID commandId, String optionKey, String note) {
        ClassSession session = sessions.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        InteractionRun run=requireRun(sessionId,runId);
        requireCompleted(run);
        if (commandId == null) throw new IllegalArgumentException("Identifique o comando.");
        var previous=notes.findByRun_IdAndCommandId(runId,commandId);
        if (previous.isPresent()) {
            LearningErrorNote prior=previous.get();
            if (!prior.getOptionKey().equals(optionKey) || !prior.getTeacherNote().equals(note == null ? null : note.trim())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Chave de comando reutilizada com conteúdo diferente.");
            }
            return view(run);
        }
        if (note == null || note.isBlank() || note.trim().length() > 1200) {
            throw new IllegalArgumentException("Descreva a orientação docente em até 1200 caracteres.");
        }
        Set<String> incorrectKeys = incorrectKeys(run.getDefinition());
        if (!incorrectKeys.contains(optionKey)) {
            throw new IllegalArgumentException("Selecione uma alternativa incorreta da questão.");
        }
        if (engine.result(runId).choiceDistribution().getOrDefault(optionKey,0L) == 0L) {
            throw new IllegalArgumentException("A alternativa precisa ter ao menos uma resposta registrada.");
        }
        notes.saveAndFlush(new LearningErrorNote(session,run,optionKey,commandId,note));
        events.record(session, SessionEventType.ERROR_CLINIC_NOTE_ADDED, SessionEventActor.TEACHER,
                "Orientação sobre alternativa registrada", Map.of("runId",runId.toString(),"optionKey",optionKey));
        return view(run);
    }

    private InteractionRun requireRun(UUID sessionId, UUID runId) {
        InteractionRun run=runs.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Verificação não encontrada."));
        if (!sessionId.equals(run.getSession().getId()))
            throw new ResourceNotFoundException("Verificação não encontrada nesta sessão.");
        return run;
    }

    private void requireCompleted(InteractionRun run) {
        InteractionDefinition definition=run.getDefinition();
        if (run.getStatus()!=InteractionRunStatus.CLOSED
                || definition.getResponseKind()!=InteractionResponseKind.CHOICE
                || definition.getEvaluationMode()!=InteractionEvaluationMode.CORRECT_ANSWER
                || !definition.isProducesEvidence()) {
            throw new IllegalArgumentException("Encerre uma verificação de alternativas com avaliação antes da Clínica do Erro.");
        }
        long received=responses.countByRunId(run.getId());
        if (received==0 || evidence.evidenceForRun(run.getId()).size()!=received)
            throw new IllegalArgumentException("Esta verificação precisa conter respostas avaliadas para a Clínica do Erro.");
    }

    private Set<String> incorrectKeys(InteractionDefinition definition) {
        try {
            Map<String,Object> config=json.readValue(definition.getEvaluationConfigJson(),new TypeReference<>() {});
            Object raw=config.get("correctOptionKeys");
            if (!(raw instanceof List<?> keys) || keys.isEmpty())
                throw new IllegalArgumentException("Questão sem gabarito validado.");
            return definition.getOptions().stream()
                    .map(InteractionOption::getOptionKey)
                    .filter(key -> !keys.contains(key))
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());
        } catch (IllegalArgumentException exception) { throw exception; }
        catch (RuntimeException exception) {
            throw new IllegalArgumentException("Não foi possível validar o gabarito desta questão.");
        }
    }

    private ClinicView view(InteractionRun run) {
        var result=engine.result(run.getId());
        Set<String> incorrect=incorrectKeys(run.getDefinition());
        List<OptionView> options=run.getDefinition().getOptions().stream()
                .map(option -> new OptionView(option.getOptionKey(),option.getLabel(),
                        result.choiceDistribution().getOrDefault(option.getOptionKey(),0L),
                        incorrect.contains(option.getOptionKey())))
                .toList();
        List<NoteView> entries=notes.findByRun_IdOrderByCreatedAtAsc(run.getId()).stream()
                .map(row -> new NoteView(row.getId(),row.getOptionKey(),row.getTeacherNote(),row.getCreatedAt()))
                .toList();
        return new ClinicView(run.getId(),result.participation().responseCount(),options,entries,
                "Distribuição observada não comprova a causa do erro. A interpretação é responsabilidade docente.");
    }

    public record OptionView(String key,String label,long count,boolean incorrect) {}
    public record NoteView(UUID id,String optionKey,String note,Instant createdAt) {}
    public record ClinicView(UUID runId,long responseCount,List<OptionView> options,
                             List<NoteView> notes,String disclaimer) {}
}
