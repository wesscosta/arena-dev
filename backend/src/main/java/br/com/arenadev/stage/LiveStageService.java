package br.com.arenadev.stage;

import br.com.arenadev.activity.ActivityStep;
import br.com.arenadev.activity.ActivityStepRepository;
import br.com.arenadev.activity.ActivityStepType;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.dynamic.DynamicType;
import br.com.arenadev.dynamic.SessionDynamic;
import br.com.arenadev.dynamic.SessionDynamicRepository;
import br.com.arenadev.identity.DisplayNamePolicy;
import br.com.arenadev.identity.DisplayNameService;
import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class LiveStageService {
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SessionDynamicRepository dynamicRepository;
    private final SessionRealtimeGateway realtimeGateway;
    private final DisplayNameService displayNameService;
    private final ActivityStepRepository activityStepRepository;
    private final JsonMapper json;
    private final JdbcTemplate jdbc;

    public LiveStageService(
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            SessionDynamicRepository dynamicRepository,
            SessionRealtimeGateway realtimeGateway,
            DisplayNameService displayNameService,
            ActivityStepRepository activityStepRepository,
            JsonMapper json, JdbcTemplate jdbc
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.dynamicRepository = dynamicRepository;
        this.realtimeGateway = realtimeGateway;
        this.displayNameService = displayNameService;
        this.activityStepRepository = activityStepRepository;
        this.json = json;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public StateView state(UUID sessionId) {
        requireSession(sessionId);
        return project(sessionId, readStored(sessionId), Projection.TEACHER);
    }

    @Transactional(readOnly = true)
    public StateView projectorState(UUID sessionId) {
        requireSession(sessionId);
        return project(sessionId, readStored(sessionId), Projection.PROJECTOR);
    }

    @Transactional(readOnly = true)
    public StateView participantState(UUID sessionId) {
        requireSession(sessionId);
        return project(sessionId, readStored(sessionId), Projection.PARTICIPANT);
    }

    @Transactional
    public StateView activate(UUID sessionId, ActivateCommand command) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
        LiveStageType type = command.type() == null ? LiveStageType.IDLE : command.type();
        if (type == LiveStageType.MATERIAL) {
            throw new IllegalArgumentException("Use a publicação protegida de material.");
        }
        LiveStageAudience audience = command.audience() == null
                ? defaultAudience(type)
                : command.audience();
        boolean timerOverlay = command.timerOverlay() == null || command.timerOverlay();

        UUID sourceId = type == LiveStageType.IDLE ? null : command.sourceId();
        if (type == LiveStageType.DRAW && sourceId == null) {
            throw new IllegalArgumentException("Informe o aluno sorteado para projetar o Sorteio.");
        }
        if (type == LiveStageType.DRAW) {
            requireParticipantStudent(sessionId, sourceId);
        }
        if ((type == LiveStageType.SLIDE || type == LiveStageType.QUESTION) && sourceId == null) {
            throw new IllegalArgumentException("Informe o bloco do Roteiro ao Vivo para este palco.");
        }
        if (type == LiveStageType.QUIZ && sourceId == null) {
            throw new IllegalArgumentException("Informe a rodada de Quiz para este palco.");
        }
        if (type == LiveStageType.LEARNING_CHECK && sourceId == null) {
            throw new IllegalArgumentException(
                    "Informe a verificação de aprendizagem para este palco."
            );
        }
        if (type == LiveStageType.SLIDE) {
            requirePreparedStep(session, sourceId, ActivityStepType.SLIDE);
        }
        if (type == LiveStageType.QUESTION) {
            requirePreparedStep(session, sourceId, ActivityStepType.QUESTION);
        }

        StoredState previous = readStored(sessionId);
        revokeActiveUnderLock(sessionId);
        StoredState stored = new StoredState(type.name(), sourceId == null ? null : sourceId.toString(),
                audience.name(), timerOverlay, Instant.now().toString(), previous.stageVersion() + 1, null);
        save(session, stored);
        publishAfterCommit(sessionId, stored);
        return project(sessionId, stored, Projection.TEACHER);
    }

    @Transactional
    public StateView showDraw(UUID sessionId, UUID studentId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.DRAW,
                        studentId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showSlide(UUID sessionId, UUID stepId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.SLIDE,
                        stepId,
                        LiveStageAudience.PROJECTOR,
                        true
                )
        );
    }

    @Transactional
    public StateView showQuestion(UUID sessionId, UUID stepId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.QUESTION,
                        stepId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showWordCloud(UUID sessionId, UUID roundId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.WORD_CLOUD,
                        roundId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showBuzzer(UUID sessionId, UUID roundId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.BUZZER,
                        roundId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showPoll(UUID sessionId, UUID roundId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.POLL,
                        roundId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showQuiz(UUID sessionId, UUID roundId) {
        if (roundId == null) {
            throw new IllegalArgumentException("Informe a rodada de Quiz para este palco.");
        }
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.QUIZ,
                        roundId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showLearningCheck(UUID sessionId, UUID runId) {
        if (runId == null) {
            throw new IllegalArgumentException(
                    "Informe a verificação de aprendizagem para este palco."
            );
        }
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.LEARNING_CHECK,
                        runId,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView showBossBattle(UUID sessionId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.BOSS_BATTLE,
                        null,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional
    public StateView clear(UUID sessionId) {
        return activate(
                sessionId,
                new ActivateCommand(
                        LiveStageType.IDLE,
                        null,
                        LiveStageAudience.BOTH,
                        true
                )
        );
    }

    @Transactional(readOnly = true)
    public long version(UUID sessionId) {
        requireSession(sessionId);
        return readStored(sessionId).stageVersion();
    }

    @Transactional(readOnly = true)
    public UUID activeMaterialId(UUID sessionId) {
        StoredState stored = readStored(sessionId);
        return LiveStageType.MATERIAL.name().equals(stored.type()) ? parseUuid(stored.sourceId()) : null;
    }

    @Transactional(readOnly = true)
    public boolean isPublishedMaterial(UUID sessionId, UUID publicationId) {
        return publicationId != null && publicationId.equals(activeMaterialId(sessionId));
    }

    // Caller holds session row lock; mutate snapshot status in the current transaction.
    public void revokeActiveUnderLock(UUID sessionId) {
        jdbc.update("""
                update arena_material_publications set status='REVOKED', revoked_at=now()
                where session_id=? and status='ACTIVE'
                """, sessionId);
    }

    @Transactional
    public void showPublishedMaterialUnderLock(UUID sessionId, UUID publicationId, long nextVersion) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus() != SessionStatus.ACTIVE || readStored(sessionId).stageVersion()+1 != nextVersion) {
            throw new IllegalArgumentException("Transição inválida.");
        }
        StoredState stored = new StoredState(LiveStageType.MATERIAL.name(), publicationId.toString(),
                LiveStageAudience.PROJECTOR.name(), true, Instant.now().toString(), nextVersion, null);
        save(session, stored);
        publishAfterCommit(sessionId, stored);
    }

    /**
     * The caller holds the session row lock and has validated publication and
     * anchor against its immutable outline. Only the teacher route may call it.
     */
    public StateView navigateMaterialUnderLock(UUID sessionId, UUID publicationId,
            String sectionAnchor, long expectedVersion) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        StoredState previous = readStored(sessionId);
        if (session.getStatus() != SessionStatus.ACTIVE
                || !LiveStageType.MATERIAL.name().equals(previous.type())
                || !publicationId.equals(parseUuid(previous.sourceId()))
                || previous.stageVersion() != expectedVersion) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "O material ou a versão do palco mudou.");
        }
        StoredState next = new StoredState(previous.type(), previous.sourceId(),
                previous.audience(), previous.timerOverlay(), Instant.now().toString(),
                previous.stageVersion() + 1, sectionAnchor);
        save(session, next);
        publishAfterCommit(sessionId, next);
        return project(sessionId, next, Projection.TEACHER);
    }

    @Transactional
    public void clearPublishedMaterialUnderLock(UUID sessionId) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        StoredState previous = readStored(sessionId);
        revokeActiveUnderLock(sessionId);
        if (!LiveStageType.MATERIAL.name().equals(previous.type())) return;
        StoredState next = StoredState.idle(previous.stageVersion()+1);
        save(session,next);
        publishAfterCommit(sessionId,next);
    }

    @Transactional
    public void revokeForResource(UUID resourceId) {
        var sessionIds = jdbc.query("""
                select distinct session_id from arena_material_publications
                where resource_id=? and status='ACTIVE' order by session_id
                """, (rs,row) -> rs.getObject(1,UUID.class), resourceId);
        for (UUID sessionId : sessionIds) {
            sessionRepository.findByIdForUpdate(sessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
            clearPublishedMaterialUnderLock(sessionId);
        }
    }

    @Transactional
    public void revokeForFinishedSession(UUID sessionId) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        StoredState previous = readStored(sessionId);
        revokeActiveUnderLock(sessionId);
        if (LiveStageType.MATERIAL.name().equals(previous.type())) {
            StoredState next = StoredState.idle(previous.stageVersion()+1);
            save(session,next);
            publishAfterCommit(sessionId,next);
        }
    }

    private void publishAfterCommit(UUID sessionId, StoredState stored) {
        realtimeGateway.broadcastTeachersAfterCommit(
                sessionId,
                "LIVE_STAGE_STATE",
                project(sessionId, stored, Projection.TEACHER)
        );
        realtimeGateway.broadcastParticipantsAfterCommit(
                sessionId,
                "LIVE_STAGE_STATE",
                project(sessionId, stored, Projection.PARTICIPANT)
        );
        realtimeGateway.broadcastProjectorsAfterCommit(
                sessionId,
                "LIVE_STAGE_STATE",
                project(sessionId, stored, Projection.PROJECTOR)
        );
    }

    private StateView project(UUID sessionId, StoredState stored, Projection projection) {
        LiveStageType type = parseType(stored.type());
        if (type == LiveStageType.MATERIAL) {
            Integer allowed = jdbc.queryForObject("""
                    select count(*) from arena_material_publications p
                    join class_sessions s on s.id=p.session_id
                    join learning_resources r on r.id=p.resource_id
                    join arena_session_resource_placements x on x.session_id=p.session_id
                      and x.resource_id=p.resource_id
                    where p.id=? and p.session_id=? and p.status='ACTIVE'
                      and s.status='ACTIVE' and r.library_visible=true
                      and r.archived_at is null and r.classroom_id is null
                    """, Integer.class, parseUuid(stored.sourceId()), sessionId);
            if (allowed == null || allowed == 0) {
                stored = StoredState.idle(stored.stageVersion());
                type = LiveStageType.IDLE;
            }
        }
        LiveStageAudience audience = parseAudience(stored.audience());
        boolean visible = switch (projection) {
            case TEACHER -> true;
            case PROJECTOR -> audience.includesProjector();
            case PARTICIPANT -> audience.includesParticipants();
        };

        if (!visible) {
            return new StateView(
                    sessionId,
                    new PrimaryView(LiveStageType.IDLE, null, null, null, null, null),
                    new OverlayView(stored.timerOverlay()),
                    audience,
                    parseInstant(stored.activatedAt()),
                    stored.stageVersion()
            );
        }

        UUID sourceId = parseUuid(stored.sourceId());
        String displayName = type == LiveStageType.DRAW && sourceId != null
                ? displayNameForStudent(sessionId, sourceId)
                : null;
        PreparedStepView preparedStep = (type == LiveStageType.SLIDE || type == LiveStageType.QUESTION)
                && sourceId != null
                ? preparedStep(sessionId, sourceId, type)
                : null;

        UUID projectedSourceId = projection != Projection.TEACHER && type == LiveStageType.DRAW
                ? null
                : sourceId;

        return new StateView(
                sessionId,
                new PrimaryView(
                        type,
                        projectedSourceId,
                        displayName,
                        preparedStep,
                        parseInstant(stored.activatedAt()),
                        stored.sectionAnchor()
                ),
                new OverlayView(stored.timerOverlay()),
                audience,
                parseInstant(stored.activatedAt()),
                stored.stageVersion()
        );
    }

    private PreparedStepView preparedStep(UUID sessionId, UUID stepId, LiveStageType type) {
        ClassSession session = requireSession(sessionId);
        ActivityStepType expected = type == LiveStageType.SLIDE
                ? ActivityStepType.SLIDE
                : ActivityStepType.QUESTION;
        ActivityStep step = requirePreparedStep(session, stepId, expected);

        PublicQuestionView question = null;
        if (step.getType() == ActivityStepType.QUESTION && step.getQuestion() != null) {
            var source = step.getQuestion();
            question = new PublicQuestionView(
                    source.getId(),
                    source.getType(),
                    source.getStatement(),
                    source.getPoints(),
                    readOptions(source.getOptionsJson()),
                    source.getCode(),
                    source.getLanguage()
            );
        }

        return new PreparedStepView(
                step.getId(),
                step.getTitle(),
                step.getInstructions(),
                step.getType() == ActivityStepType.SLIDE ? step.getSlideContent() : null,
                question
        );
    }

    private ActivityStep requirePreparedStep(
            ClassSession session,
            UUID stepId,
            ActivityStepType expectedType
    ) {
        ActivityStep step = activityStepRepository.findById(stepId)
                .orElseThrow(() -> new ResourceNotFoundException("Bloco do Roteiro ao Vivo não encontrado."));
        if (!step.getActivity().getClassroom().getId().equals(session.getClassroom().getId())) {
            throw new IllegalArgumentException("O bloco do Roteiro ao Vivo não pertence à turma da sessão.");
        }
        if (step.getType() != expectedType) {
            throw new IllegalArgumentException("O bloco informado não corresponde ao tipo de palco solicitado.");
        }
        if (expectedType == ActivityStepType.QUESTION && step.getQuestion() == null) {
            throw new IllegalArgumentException("O bloco de Questão não possui questão vinculada.");
        }
        return step;
    }

    private List<QuestionOptionView> readOptions(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            List<QuestionOptionView> options = json.readValue(
                    value,
                    new TypeReference<List<QuestionOptionView>>() {}
            );
            return options == null ? List.of() : options;
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private String displayNameForStudent(UUID sessionId, UUID studentId) {
        SessionParticipant participant = requireParticipantStudent(sessionId, studentId);
        UUID classroomId = participant.getSession().getClassroom().getId();
        return displayNameService.resolve(
                classroomId,
                participant.getStudent(),
                DisplayNamePolicy.PREFERRED_NAME
        );
    }

    private SessionParticipant requireParticipantStudent(UUID sessionId, UUID studentId) {
        return participantRepository.findBySessionIdOrderByStudentNameAsc(sessionId)
                .stream()
                .filter(item -> item.getStudent().getId().equals(studentId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "O aluno informado não participa desta sessão."
                ));
    }

    private StoredState readStored(UUID sessionId) {
        return dynamicRepository.findBySessionIdAndType(sessionId, DynamicType.LIVE_STAGE)
                .map(SessionDynamic::getStateJson)
                .map(raw -> {
                    try {
                        return json.readValue(raw, StoredState.class);
                    } catch (RuntimeException ignored) {
                        return StoredState.idle();
                    }
                })
                .orElseGet(StoredState::idle);
    }

    private void save(ClassSession session, StoredState stored) {
        SessionDynamic dynamic = dynamicRepository
                .findBySessionIdAndType(session.getId(), DynamicType.LIVE_STAGE)
                .orElseGet(() -> new SessionDynamic(session, DynamicType.LIVE_STAGE));
        try {
            dynamic.updateState(json.writeValueAsString(stored));
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Estado do palco não pôde ser serializado.");
        }
        dynamicRepository.save(dynamic);
    }

    private ClassSession requireSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private ClassSession requireActiveSession(UUID sessionId) {
        ClassSession session = requireSession(sessionId);
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
        return session;
    }

    private static LiveStageAudience defaultAudience(LiveStageType type) {
        return switch (type) {
            case SLIDE, TIMER -> LiveStageAudience.PROJECTOR;
            case IDLE -> LiveStageAudience.BOTH;
            default -> LiveStageAudience.BOTH;
        };
    }

    private static LiveStageType parseType(String value) {
        try {
            return value == null ? LiveStageType.IDLE : LiveStageType.valueOf(value);
        } catch (IllegalArgumentException ignored) {
            return LiveStageType.IDLE;
        }
    }

    private static LiveStageAudience parseAudience(String value) {
        try {
            return value == null ? LiveStageAudience.BOTH : LiveStageAudience.valueOf(value);
        } catch (IllegalArgumentException ignored) {
            return LiveStageAudience.BOTH;
        }
    }

    private static UUID parseUuid(String value) {
        try {
            return value == null || value.isBlank() ? null : UUID.fromString(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private static Instant parseInstant(String value) {
        try {
            return value == null || value.isBlank() ? null : Instant.parse(value);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private enum Projection {
        TEACHER,
        PROJECTOR,
        PARTICIPANT
    }

    private record StoredState(
            String type, String sourceId, String audience, boolean timerOverlay,
            String activatedAt, long stageVersion, String sectionAnchor
    ) {
        static StoredState idle() { return idle(0); }
        static StoredState idle(long version) {
            return new StoredState(LiveStageType.IDLE.name(), null,
                    LiveStageAudience.BOTH.name(), true, null, version, null);
        }
    }

    public record ActivateCommand(
            LiveStageType type,
            UUID sourceId,
            LiveStageAudience audience,
            Boolean timerOverlay
    ) {
    }

    public record StateView(
            UUID sessionId,
            PrimaryView primary,
            OverlayView overlays,
            LiveStageAudience audience,
            Instant occurredAt,
            long stageVersion
    ) {
    }

    public record PrimaryView(
            LiveStageType type,
            UUID sourceId,
            String displayName,
            PreparedStepView step,
            Instant activatedAt,
            String sectionAnchor
    ) {
    }

    public record PreparedStepView(
            UUID id,
            String title,
            String instructions,
            String slideContent,
            PublicQuestionView question
    ) {
    }

    public record PublicQuestionView(
            UUID id,
            QuestionType type,
            String statement,
            int points,
            List<QuestionOptionView> options,
            String code,
            String language
    ) {
    }

    public record QuestionOptionView(String id, String text) {
    }

    public record OverlayView(boolean timer) {
    }
}
