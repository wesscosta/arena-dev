package br.com.arenadev.dynamic;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.activity.ActivityStep;
import br.com.arenadev.activity.ActivityStepType;
import br.com.arenadev.session.*;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.stage.LiveStageService;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MechanicsService {
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final SessionDynamicRepository dynamicRepository;
    private final GroupHistoryRepository groupHistoryRepository;
    private final ActivityRepository activityRepository;
    private final LiveStageService liveStageService;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public MechanicsService(
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            SessionDynamicRepository dynamicRepository,
            GroupHistoryRepository groupHistoryRepository,
            ActivityRepository activityRepository,
            LiveStageService liveStageService
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.dynamicRepository = dynamicRepository;
        this.groupHistoryRepository = groupHistoryRepository;
        this.activityRepository = activityRepository;
        this.liveStageService = liveStageService;
    }

    @Transactional(readOnly = true)
    public RuntimeView getRuntime(UUID sessionId) {
        requireSession(sessionId);
        return runtime(sessionId);
    }

    @Transactional
    public DrawResult draw(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        List<UUID> present = presentStudentIds(sessionId);
        if (present.isEmpty()) throw new IllegalArgumentException("Não há alunos presentes para o sorteio.");

        DrawState state = readState(sessionId, DynamicType.QUICK_DRAW, DrawState.class, new DrawState(new HashMap<>(), null));
        Map<String, Integer> counts = new HashMap<>(state.drawCounts() == null ? Map.of() : state.drawCounts());
        String last = state.lastDrawnStudentId();
        List<UUID> eligible = present.size() > 1 && last != null
                ? present.stream().filter(id -> !id.toString().equals(last)).toList()
                : present;
        if (eligible.isEmpty()) eligible = present;

        List<WeightedCandidate> weighted = eligible.stream().map(id -> {
            int count = counts.getOrDefault(id.toString(), 0);
            return new WeightedCandidate(id, 1.0 / Math.pow(count + 1.0, 1.35));
        }).toList();
        double total = weighted.stream().mapToDouble(WeightedCandidate::weight).sum();
        double cursor = ThreadLocalRandom.current().nextDouble(total);
        UUID winner = weighted.get(weighted.size() - 1).studentId();
        for (WeightedCandidate candidate : weighted) {
            cursor -= candidate.weight();
            if (cursor <= 0) { winner = candidate.studentId(); break; }
        }

        counts.put(winner.toString(), counts.getOrDefault(winner.toString(), 0) + 1);
        saveState(session, DynamicType.QUICK_DRAW, new DrawState(counts, winner.toString()));
        liveStageService.showDraw(sessionId, winner);
        return new DrawResult(winner, runtime(sessionId));
    }

    @Transactional
    public GroupsResult organizeGroups(UUID sessionId, int groupSize) {
        ClassSession session = requireActiveSession(sessionId);
        if (groupSize < 1 || groupSize > 12) throw new IllegalArgumentException("Tamanho de grupo inválido.");
        List<String> ids = presentStudentIds(sessionId).stream().map(UUID::toString).toList();
        if (ids.isEmpty()) throw new IllegalArgumentException("Não há alunos presentes para organizar.");

        List<List<List<String>>> history = groupHistoryRepository.findByClassroomIdOrderByCreatedAtAsc(session.getClassroom().getId()).stream()
                .map(item -> readJson(item.getGroupsJson(), new TypeReference<List<List<String>>>() {}, List.of()))
                .toList();
        List<List<String>> groups = balancedGroups(ids, groupSize, history);
        saveState(session, DynamicType.GROUPS, new GroupsState(groups, groupSize));
        if (groupSize > 1) {
            groupHistoryRepository.save(new GroupHistory(session.getClassroom(), session, writeJson(groups)));
        }
        return new GroupsResult(groups, runtime(sessionId));
    }

    @Transactional
    public RuntimeView startBoss(UUID sessionId, String name, int maxHp) {
        ClassSession session = requireActiveSession(sessionId);
        if (maxHp < 10) throw new IllegalArgumentException("O Boss precisa ter ao menos 10 HP.");
        String normalizedName = name == null || name.isBlank() ? "Boss" : name.trim();
        saveState(session, DynamicType.BOSS_BATTLE, new BossState(normalizedName, maxHp, maxHp));
        return runtime(sessionId);
    }

    @Transactional
    public RuntimeView damageBoss(UUID sessionId, int amount) {
        ClassSession session = requireActiveSession(sessionId);
        if (amount <= 0) throw new IllegalArgumentException("O dano precisa ser maior que zero.");
        BossState boss = readState(sessionId, DynamicType.BOSS_BATTLE, BossState.class, null);
        if (boss == null) throw new IllegalArgumentException("Nenhum Boss está ativo nesta sessão.");
        saveState(session, DynamicType.BOSS_BATTLE, new BossState(boss.name(), boss.maxHp(), Math.max(0, boss.currentHp() - amount)));
        return runtime(sessionId);
    }

    @Transactional
    public RuntimeView setArenaSource(UUID sessionId, UUID activityId) {
        ClassSession session = requireActiveSession(sessionId);
        if (activityId == null) {
            saveState(
                    session,
                    DynamicType.ARENA,
                    new ArenaState(null, null, List.of(), null, null)
            );
            return runtime(sessionId);
        }

        Activity activity = requireActivityForSession(session, activityId);
        if (activity.getQuestions().isEmpty() && activity.getSteps().isEmpty()) {
            throw new IllegalArgumentException(
                    "A atividade selecionada não possui questões nem Roteiro ao Vivo."
            );
        }

        saveState(
                session,
                DynamicType.ARENA,
                new ArenaState(
                        activity.getId().toString(),
                        null,
                        List.of(),
                        null,
                        null
                )
        );
        return runtime(sessionId);
    }

    @Transactional
    public ArenaQuestionResult nextArenaQuestion(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        ArenaState state = readArenaState(sessionId);

        if (state.currentStepId() != null) {
            throw new IllegalArgumentException(
                    "O Roteiro ao Vivo está ativo. Use Anterior/Próximo na Condução."
            );
        }

        if (state.activityId() == null) {
            throw new IllegalArgumentException(
                    "Selecione uma atividade com questões ou use o modo livre."
            );
        }

        Activity activity = requireActivityForSession(
                session,
                UUID.fromString(state.activityId())
        );

        Set<String> answered = new LinkedHashSet<>(
                state.answeredQuestionIds() == null
                        ? List.of()
                        : state.answeredQuestionIds()
        );

        ActivityQuestion next = activity.getQuestions().stream()
                .filter(question -> !answered.contains(question.getId().toString()))
                .findFirst()
                .orElse(null);

        if (next == null) {
            return new ArenaQuestionResult(null, true, runtime(sessionId));
        }

        answered.add(next.getId().toString());
        saveState(
                session,
                DynamicType.ARENA,
                new ArenaState(
                        activity.getId().toString(),
                        next.getId().toString(),
                        new ArrayList<>(answered),
                        null,
                        null
                )
        );
        return new ArenaQuestionResult(next.getId(), false, runtime(sessionId));
    }

    @Transactional
    public RuntimeView restartArenaQuestions(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        ArenaState state = readArenaState(sessionId);

        if (state.currentStepId() != null) {
            throw new IllegalArgumentException(
                    "O Roteiro ao Vivo está ativo. Navegue pelo roteiro em vez de reiniciar a sequência legada."
            );
        }

        saveState(
                session,
                DynamicType.ARENA,
                new ArenaState(state.activityId(), null, List.of(), null, null)
        );
        return runtime(sessionId);
    }

    @Transactional(readOnly = true)
    public LiveFlowView getLiveFlow(UUID sessionId) {
        ClassSession session = requireSession(sessionId);
        return liveFlowView(session, readArenaState(sessionId));
    }

    @Transactional
    public LiveFlowResult startLiveFlow(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        ArenaState state = readArenaState(sessionId);
        Activity activity = requireFlowActivity(session, state);

        if (activity.getSteps().isEmpty()) {
            throw new IllegalArgumentException(
                    "A atividade selecionada não possui Roteiro ao Vivo."
            );
        }

        Integer current = resolveCurrentStepIndex(activity, state);
        if (current != null) {
            return new LiveFlowResult(
                    liveFlowView(session, state),
                    runtime(sessionId)
            );
        }

        return activateLiveStep(session, state, activity, 0);
    }

    @Transactional
    public LiveFlowResult nextLiveFlow(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        ArenaState state = readArenaState(sessionId);
        Activity activity = requireFlowActivity(session, state);

        if (activity.getSteps().isEmpty()) {
            throw new IllegalArgumentException(
                    "A atividade selecionada não possui Roteiro ao Vivo."
            );
        }

        Integer current = resolveCurrentStepIndex(activity, state);
        if (current == null) {
            return activateLiveStep(session, state, activity, 0);
        }

        if (current >= activity.getSteps().size() - 1) {
            return new LiveFlowResult(
                    liveFlowView(session, state),
                    runtime(sessionId)
            );
        }

        return activateLiveStep(session, state, activity, current + 1);
    }

    @Transactional
    public LiveFlowResult previousLiveFlow(UUID sessionId) {
        ClassSession session = requireActiveSession(sessionId);
        ArenaState state = readArenaState(sessionId);
        Activity activity = requireFlowActivity(session, state);

        Integer current = resolveCurrentStepIndex(activity, state);
        if (current == null || current <= 0) {
            return new LiveFlowResult(
                    liveFlowView(session, state),
                    runtime(sessionId)
            );
        }

        return activateLiveStep(session, state, activity, current - 1);
    }

    private RuntimeView runtime(UUID sessionId) {
        DrawState draw = readState(
                sessionId,
                DynamicType.QUICK_DRAW,
                DrawState.class,
                new DrawState(Map.of(), null)
        );
        BossState boss = readState(
                sessionId,
                DynamicType.BOSS_BATTLE,
                BossState.class,
                null
        );
        ArenaState arena = readArenaState(sessionId);
        GroupsState groups = readState(
                sessionId,
                DynamicType.GROUPS,
                GroupsState.class,
                new GroupsState(List.of(), 2)
        );

        return new RuntimeView(
                sessionId,
                draw.drawCounts() == null ? Map.of() : draw.drawCounts(),
                draw.lastDrawnStudentId(),
                boss,
                arena.activityId(),
                arena.currentQuestionId(),
                arena.answeredQuestionIds() == null
                        ? List.of()
                        : arena.answeredQuestionIds(),
                arena.currentStepId(),
                arena.currentStepPosition(),
                groups.groups() == null ? List.of() : groups.groups(),
                groups.groupSize()
        );
    }

    private ArenaState readArenaState(UUID sessionId) {
        return readState(
                sessionId,
                DynamicType.ARENA,
                ArenaState.class,
                new ArenaState(null, null, List.of(), null, null)
        );
    }

    private Activity requireFlowActivity(
            ClassSession session,
            ArenaState state
    ) {
        if (state.activityId() == null) {
            throw new IllegalArgumentException(
                    "Selecione uma atividade com Roteiro ao Vivo."
            );
        }
        return requireActivityForSession(
                session,
                UUID.fromString(state.activityId())
        );
    }

    private Integer resolveCurrentStepIndex(
            Activity activity,
            ArenaState state
    ) {
        List<ActivityStep> steps = activity.getSteps();

        if (state.currentStepId() != null) {
            for (int index = 0; index < steps.size(); index++) {
                if (steps.get(index).getId().toString()
                        .equals(state.currentStepId())) {
                    return index;
                }
            }
        }

        Integer storedPosition = state.currentStepPosition();
        if (
                storedPosition != null
                && storedPosition >= 0
                && storedPosition < steps.size()
        ) {
            return storedPosition;
        }

        return null;
    }

    private LiveFlowResult activateLiveStep(
            ClassSession session,
            ArenaState previous,
            Activity activity,
            int index
    ) {
        List<ActivityStep> steps = activity.getSteps();
        if (index < 0 || index >= steps.size()) {
            throw new IllegalArgumentException(
                    "Posição inválida no Roteiro ao Vivo."
            );
        }

        ActivityStep step = steps.get(index);
        Set<String> answered = new LinkedHashSet<>(
                previous.answeredQuestionIds() == null
                        ? List.of()
                        : previous.answeredQuestionIds()
        );

        String currentQuestionId = null;
        if (step.getType() == ActivityStepType.QUESTION) {
            if (step.getQuestion() == null) {
                throw new IllegalArgumentException(
                        "O bloco de Questão não possui questão vinculada."
                );
            }
            currentQuestionId = step.getQuestion().getId().toString();
            answered.add(currentQuestionId);
        }

        ArenaState next = new ArenaState(
                activity.getId().toString(),
                currentQuestionId,
                new ArrayList<>(answered),
                step.getId().toString(),
                index
        );

        saveState(session, DynamicType.ARENA, next);

        return new LiveFlowResult(
                liveFlowView(session, next),
                runtime(session.getId())
        );
    }

    private LiveFlowView liveFlowView(
            ClassSession session,
            ArenaState state
    ) {
        if (state.activityId() == null) {
            return new LiveFlowView(
                    session.getId(),
                    null,
                    null,
                    List.of(),
                    null,
                    false,
                    false,
                    false
            );
        }

        Activity activity = requireActivityForSession(
                session,
                UUID.fromString(state.activityId())
        );

        List<LiveStepView> steps = activity.getSteps().stream()
                .map(this::toLiveStepView)
                .toList();

        Integer currentIndex = resolveCurrentStepIndex(activity, state);
        boolean started = currentIndex != null;

        return new LiveFlowView(
                session.getId(),
                activity.getId().toString(),
                activity.getTitle(),
                steps,
                currentIndex,
                started,
                started && currentIndex > 0,
                !steps.isEmpty()
                        && (
                            currentIndex == null
                            || currentIndex < steps.size() - 1
                        )
        );
    }

    private LiveStepView toLiveStepView(ActivityStep step) {
        WordCloudStepView wordCloud =
                step.getType() == ActivityStepType.WORD_CLOUD
                        ? new WordCloudStepView(
                            step.getWordCloudPrompt(),
                            step.getWordCloudMaxWords(),
                            Boolean.TRUE.equals(
                                    step.getWordCloudLiveReveal()
                            )
                        )
                        : null;

        PollStepView poll =
                step.getType() == ActivityStepType.POLL
                        ? new PollStepView(
                            step.getPollPrompt(),
                            readJson(
                                    step.getPollOptionsJson(),
                                    new TypeReference<List<PollOptionView>>() {},
                                    List.of()
                            ),
                            Boolean.TRUE.equals(step.getPollLiveResults())
                        )
                        : null;

        return new LiveStepView(
                step.getId(),
                step.getPosition(),
                step.getType(),
                step.getTitle(),
                step.getInstructions(),
                step.getQuestion() == null
                        ? null
                        : step.getQuestion().getId(),
                step.getSlideContent(),
                wordCloud,
                poll
        );
    }

    private List<UUID> presentStudentIds(UUID sessionId) {
        return participantRepository.findBySessionIdOrderByStudentNameAsc(sessionId).stream()
                .filter(SessionParticipant::isPresent)
                .map(participant -> participant.getStudent().getId())
                .toList();
    }

    private Activity requireActivityForSession(ClassSession session, UUID activityId) {
        Activity activity = activityRepository.findById(activityId).orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
        if (!activity.getClassroom().getId().equals(session.getClassroom().getId())) {
            throw new IllegalArgumentException("Atividade não pertence à turma da sessão.");
        }
        return activity;
    }

    private ClassSession requireSession(UUID id) {
        return sessionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private ClassSession requireActiveSession(UUID id) {
        ClassSession session = requireSession(id);
        if (session.getStatus() != SessionStatus.ACTIVE) throw new IllegalArgumentException("Sessão não está ativa.");
        return session;
    }

    private <T> T readState(UUID sessionId, DynamicType type, Class<T> klass, T fallback) {
        return dynamicRepository.findBySessionIdAndType(sessionId, type)
                .map(SessionDynamic::getStateJson)
                .map(json -> {
                    try { return objectMapper.readValue(json, klass); }
                    catch (RuntimeException ex) { return fallback; }
                }).orElse(fallback);
    }

    private void saveState(ClassSession session, DynamicType type, Object state) {
        SessionDynamic dynamic = dynamicRepository.findBySessionIdAndType(session.getId(), type)
                .orElseGet(() -> new SessionDynamic(session, type));
        dynamic.updateState(writeJson(state));
        dynamicRepository.save(dynamic);
    }

    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (RuntimeException ex) { throw new IllegalArgumentException("Estado da dinâmica não pôde ser serializado."); }
    }

    private <T> T readJson(String value, TypeReference<T> type, T fallback) {
        try { return objectMapper.readValue(value, type); }
        catch (RuntimeException ex) { return fallback; }
    }

    private static List<List<String>> balancedGroups(List<String> sourceIds, int groupSize, List<List<List<String>>> priorRuns) {
        if (groupSize <= 1) return sourceIds.stream().map(List::of).toList();
        List<String> ids = new ArrayList<>(sourceIds);
        Map<String, Integer> pairFrequency = new HashMap<>();
        for (List<List<String>> run : priorRuns) {
            for (List<String> group : run) {
                for (int i = 0; i < group.size(); i++) {
                    for (int j = i + 1; j < group.size(); j++) {
                        pairFrequency.merge(pairKey(group.get(i), group.get(j)), 1, Integer::sum);
                    }
                }
            }
        }
        Collections.shuffle(ids);
        List<List<String>> groups = new ArrayList<>();
        while (!ids.isEmpty()) {
            List<String> group = new ArrayList<>();
            group.add(ids.remove(0));
            while (group.size() < groupSize && !ids.isEmpty()) {
                int bestIndex = 0;
                int bestScore = Integer.MAX_VALUE;
                for (int i = 0; i < ids.size(); i++) {
                    String candidate = ids.get(i);
                    int score = group.stream().mapToInt(member -> pairFrequency.getOrDefault(pairKey(member, candidate), 0)).sum();
                    if (score < bestScore) { bestScore = score; bestIndex = i; }
                }
                group.add(ids.remove(bestIndex));
            }
            groups.add(group);
        }
        if (groups.size() > 1) {
            List<String> last = groups.get(groups.size() - 1);
            List<String> first = groups.get(0);
            if (last.size() == 1 && first.size() > 2) last.add(first.remove(first.size() - 1));
        }
        return groups;
    }

    private static String pairKey(String a, String b) { return a.compareTo(b) <= 0 ? a + "|" + b : b + "|" + a; }

    private record WeightedCandidate(UUID studentId, double weight) {}
    private record DrawState(
            Map<String, Integer> drawCounts,
            String lastDrawnStudentId
    ) {}
    public record BossState(String name, int maxHp, int currentHp) {}
    private record ArenaState(
            String activityId,
            String currentQuestionId,
            List<String> answeredQuestionIds,
            String currentStepId,
            Integer currentStepPosition
    ) {}
    private record GroupsState(List<List<String>> groups, int groupSize) {}

    public record RuntimeView(
            UUID sessionId,
            Map<String, Integer> drawCounts,
            String lastDrawnStudentId,
            BossState boss,
            String activityId,
            String currentQuestionId,
            List<String> answeredQuestionIds,
            String currentStepId,
            Integer currentStepPosition,
            List<List<String>> groups,
            int groupSize
    ) {}

    public record LiveFlowView(
            UUID sessionId,
            String activityId,
            String activityTitle,
            List<LiveStepView> steps,
            Integer currentIndex,
            boolean started,
            boolean hasPrevious,
            boolean hasNext
    ) {}

    public record LiveStepView(
            UUID id,
            int position,
            ActivityStepType type,
            String title,
            String instructions,
            UUID questionId,
            String slideContent,
            WordCloudStepView wordCloud,
            PollStepView poll
    ) {}

    public record WordCloudStepView(
            String prompt,
            Integer maxWordsPerParticipant,
            boolean liveReveal
    ) {}

    public record PollStepView(
            String prompt,
            List<PollOptionView> options,
            boolean liveResults
    ) {}

    public record PollOptionView(String id, String text) {}

    public record LiveFlowResult(
            LiveFlowView liveFlow,
            RuntimeView runtime
    ) {}

    public record DrawResult(UUID studentId, RuntimeView runtime) {}
    public record GroupsResult(List<List<String>> groups, RuntimeView runtime) {}
    public record ArenaQuestionResult(
            UUID questionId,
            boolean completed,
            RuntimeView runtime
    ) {}
}
