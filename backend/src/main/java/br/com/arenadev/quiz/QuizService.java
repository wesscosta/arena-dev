package br.com.arenadev.quiz;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.scoring.ScoreSource;
import br.com.arenadev.session.*;
import br.com.arenadev.sessionevent.SessionEventActor;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.*;

@Service
public class QuizService {
    private static final Set<QuizStatus> CURRENT_STATUSES = Set.of(
            QuizStatus.READY, QuizStatus.OPEN, QuizStatus.LOCKED, QuizStatus.REVEALED
    );
    private static final Set<QuestionType> SUPPORTED_TYPES = Set.of(
            QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE
    );

    private final QuizRoundRepository roundRepository;
    private final ParticipantAnswerRepository answerRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final ActivityQuestionRepository questionRepository;
    private final SessionRealtimeGateway realtimeGateway;
    private final LiveStageService liveStageService;
    private final ScoreEventService scoreEventService;
    private final SessionEventService sessionEventService;
    private final JsonMapper json = JsonMapper.builder().build();

    public QuizService(
            QuizRoundRepository roundRepository,
            ParticipantAnswerRepository answerRepository,
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            ActivityQuestionRepository questionRepository,
            SessionRealtimeGateway realtimeGateway,
            LiveStageService liveStageService,
            ScoreEventService scoreEventService,
            SessionEventService sessionEventService
    ) {
        this.roundRepository = roundRepository;
        this.answerRepository = answerRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.questionRepository = questionRepository;
        this.realtimeGateway = realtimeGateway;
        this.liveStageService = liveStageService;
        this.scoreEventService = scoreEventService;
        this.sessionEventService = sessionEventService;
    }

    @Transactional
    public StateView prepare(UUID sessionId, UUID questionId) {
        ClassSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
        ensureActive(session);

        if (!roundRepository.findCurrentBySessionIdForUpdate(sessionId, CURRENT_STATUSES).isEmpty()) {
            throw new IllegalArgumentException("Já existe um Quiz preparado ou em andamento nesta sessão.");
        }

        ActivityQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Questão não encontrada."));
        ensureQuestionBelongsToSessionClassroom(session, question);
        validateQuestion(question);

        QuizRound round = roundRepository.save(new QuizRound(session, question));
        recordQuizTransition(
                session,
                SessionEventType.QUIZ_PREPARED,
                SessionEventActor.TEACHER,
                "Quiz preparado",
                round,
                Map.of("questionId", question.getId().toString())
        );
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public StateView open(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        QuizRound round = lockRound(sessionId, roundId);
        QuizStatus before = round.getStatus();
        round.open(Instant.now());
        liveStageService.showQuiz(sessionId, round.getId());
        if (before != round.getStatus()) {
            recordQuizTransition(
                    session,
                    SessionEventType.QUIZ_OPENED,
                    SessionEventActor.TEACHER,
                    "Quiz aberto para respostas",
                    round,
                    Map.of()
            );
        }
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public StateView lock(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        QuizRound round = lockRound(sessionId, roundId);
        QuizStatus before = round.getStatus();
        round.lock(Instant.now());
        EvaluationSummary evaluation = evaluateLockedRound(round);
        if (before != round.getStatus()) {
            recordQuizTransition(
                    session,
                    SessionEventType.QUIZ_LOCKED,
                    SessionEventActor.TEACHER,
                    "Quiz bloqueado e avaliado",
                    round,
                    Map.of(
                            "evaluatedAnswers", evaluation.evaluatedAnswers(),
                            "correctAnswers", evaluation.correctAnswers(),
                            "awardedXp", evaluation.awardedXp()
                    )
            );
        }
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public StateView reveal(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        QuizRound round = lockRound(sessionId, roundId);
        QuizStatus before = round.getStatus();
        round.reveal(Instant.now());
        if (before != round.getStatus()) {
            recordQuizTransition(
                    session,
                    SessionEventType.QUIZ_REVEALED,
                    SessionEventActor.TEACHER,
                    "Resultado do Quiz revelado",
                    round,
                    Map.of()
            );
        }
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public StateView close(UUID sessionId, UUID roundId) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        QuizRound round = lockRound(sessionId, roundId);
        QuizStatus before = round.getStatus();
        round.close(Instant.now());
        if (before != round.getStatus()) {
            recordQuizTransition(
                    session,
                    SessionEventType.QUIZ_CLOSED,
                    SessionEventActor.TEACHER,
                    "Quiz encerrado",
                    round,
                    Map.of("revealed", round.resultsVisiblePublicly())
            );
        }
        broadcastStateAfterCommit(sessionId, round);
        return stateOf(round, Projection.TEACHER);
    }

    @Transactional
    public ParticipantStateView answer(
            UUID sessionId,
            UUID roundId,
            UUID participantId,
            Object rawAnswer
    ) {
        ClassSession session = getSession(sessionId);
        ensureActive(session);
        QuizRound round = lockRound(sessionId, roundId);
        if (!round.acceptsAnswers()) {
            throw new IllegalArgumentException("O Quiz não está aceitando respostas.");
        }

        SessionParticipant participant = participantRepository
                .findByIdAndSessionIdForUpdate(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado nesta sessão."));

        String answerJson = normalizeAnswer(round.getQuestion(), rawAnswer);
        ParticipantAnswer answer = answerRepository
                .findByRoundIdAndParticipantId(roundId, participantId)
                .orElse(null);

        if (answer == null) {
            answerRepository.save(new ParticipantAnswer(round, participant, answerJson));
        } else if (!Objects.equals(answer.getAnswerJson(), answerJson)) {
            answer.updateAnswer(answerJson, Instant.now());
        }

        broadcastStateAfterCommit(sessionId, round);
        return participantStateOf(round, participantId);
    }

    @Transactional(readOnly = true)
    public StateView state(UUID sessionId) {
        getSession(sessionId);
        return latestRound(sessionId)
                .map(round -> stateOf(round, Projection.TEACHER))
                .orElseGet(StateView::empty);
    }

    @Transactional(readOnly = true)
    public StateView publicState(UUID sessionId) {
        getSession(sessionId);
        return latestRound(sessionId)
                .map(round -> stateOf(round, Projection.PUBLIC))
                .orElseGet(StateView::empty);
    }

    @Transactional(readOnly = true)
    public ParticipantStateView participantState(UUID sessionId, UUID participantId) {
        getSession(sessionId);
        participantRepository.findByIdAndSessionId(participantId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Participante não encontrado nesta sessão."));
        return latestRound(sessionId)
                .map(round -> participantStateOf(round, participantId))
                .orElseGet(ParticipantStateView::empty);
    }

    @Transactional
    public void closeOpenForFinishedSession(UUID sessionId) {
        List<QuizRound> current = roundRepository.findCurrentBySessionIdForUpdate(sessionId, CURRENT_STATUSES);
        if (current.isEmpty()) return;
        Instant now = Instant.now();
        for (QuizRound round : current) {
            QuizStatus before = round.getStatus();
            round.close(now);
            if (before != round.getStatus()) {
                recordQuizTransition(
                        round.getSession(),
                        SessionEventType.QUIZ_CLOSED,
                        SessionEventActor.SYSTEM,
                        "Quiz encerrado com a sessão",
                        round,
                        Map.of("revealed", round.resultsVisiblePublicly())
                );
            }
        }
        broadcastStateAfterCommit(sessionId, current.getFirst());
    }

    private EvaluationSummary evaluateLockedRound(QuizRound round) {
        ActivityQuestion question = round.getQuestion();
        Object expected = readJsonValue(question.getAnswerJson());
        int evaluatedAnswers = 0;
        int correctAnswers = 0;
        int awardedXp = 0;
        Instant now = Instant.now();

        for (ParticipantAnswer answer : answerRepository.findByRoundIdOrderBySubmittedAtAsc(round.getId())) {
            if (answer.isEvaluated()) continue;

            boolean correct = Objects.equals(readJsonValue(answer.getAnswerJson()), expected);
            UUID scoreEventId = null;

            if (correct) {
                correctAnswers += 1;
                int points = Math.max(0, question.getPoints());
                if (points > 0) {
                    SessionParticipant participant = answer.getParticipant();
                    ScoreEventService.ScoreEventView score = scoreEventService.create(
                            new ScoreEventService.CreateScoreEvent(
                                    round.getSession().getClassroom().getId(),
                                    participant.getStudent().getId(),
                                    round.getSession().getId(),
                                    points,
                                    ScoreCategory.QUESTION,
                                    "Quiz · resposta correta: " + question.getStatement(),
                                    ScoreSource.QUIZ,
                                    question.getActivity().getId().toString(),
                                    question.getId().toString()
                            )
                    );
                    scoreEventId = score.id();
                    awardedXp += points;
                }
            }

            answer.evaluate(correct, scoreEventId, now);
            evaluatedAnswers += 1;
        }

        return new EvaluationSummary(evaluatedAnswers, correctAnswers, awardedXp);
    }

    private void recordQuizTransition(
            ClassSession session,
            SessionEventType type,
            SessionEventActor actor,
            String summary,
            QuizRound round,
            Map<String, ?> extra
    ) {
        LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
        payload.put("roundId", round.getId().toString());
        payload.put("questionId", round.getQuestion().getId().toString());
        payload.put("status", round.getStatus().name());
        if (extra != null) payload.putAll(extra);
        sessionEventService.record(session, type, actor, summary, payload);
    }

    private StateView stateOf(QuizRound round, Projection projection) {
        ActivityQuestion question = round.getQuestion();
        List<ParticipantAnswer> answers = answerRepository.findByRoundIdOrderBySubmittedAtAsc(round.getId());
        Map<String, Integer> counts = new LinkedHashMap<>();
        List<QuestionOptionView> options = questionOptions(question);

        for (QuestionOptionView option : options) {
            counts.put(canonicalOptionAnswer(question.getType(), option.id()), 0);
        }
        for (ParticipantAnswer answer : answers) {
            counts.computeIfPresent(answer.getAnswerJson(), (ignored, value) -> value + 1);
        }

        int totalAnswers = answers.size();
        boolean publicResultsVisible = round.resultsVisiblePublicly();
        boolean exposeResults = projection == Projection.TEACHER || publicResultsVisible;
        boolean exposeQuestion = projection == Projection.TEACHER || round.getStatus() != QuizStatus.READY;

        List<DistributionView> distribution = options.stream()
                .map(option -> {
                    int count = counts.getOrDefault(
                            canonicalOptionAnswer(question.getType(), option.id()), 0
                    );
                    Double percentage = totalAnswers == 0 ? 0d : (count * 100d) / totalAnswers;
                    return new DistributionView(
                            option.id(),
                            option.text(),
                            exposeResults ? count : null,
                            exposeResults ? percentage : null
                    );
                })
                .toList();

        return new StateView(new RoundView(
                round.getId(),
                round.getSession().getId(),
                round.getStatus(),
                exposeQuestion ? new QuestionView(
                        question.getId(),
                        question.getType(),
                        question.getStatement(),
                        question.getPoints(),
                        options,
                        question.getCode(),
                        question.getLanguage()
                ) : null,
                totalAnswers,
                publicResultsVisible,
                distribution,
                exposeResults ? readJsonValue(question.getAnswerJson()) : null,
                round.getOpenedAt(),
                round.getLockedAt(),
                round.getRevealedAt(),
                round.getClosedAt(),
                round.getCreatedAt(),
                round.getUpdatedAt()
        ));
    }

    private ParticipantStateView participantStateOf(QuizRound round, UUID participantId) {
        ParticipantAnswer answer = answerRepository
                .findByRoundIdAndParticipantId(round.getId(), participantId)
                .orElse(null);
        boolean resultsVisible = round.resultsVisiblePublicly();
        return new ParticipantStateView(
                round.getId(),
                round.getStatus(),
                round.acceptsAnswers(),
                answer != null,
                answer == null ? null : readJsonValue(answer.getAnswerJson()),
                resultsVisible,
                resultsVisible ? readJsonValue(round.getQuestion().getAnswerJson()) : null,
                answer == null ? null : answer.getSubmittedAt(),
                answer == null ? null : answer.getUpdatedAt()
        );
    }

    private void broadcastStateAfterCommit(UUID sessionId, QuizRound round) {
        StateView teacher = stateOf(round, Projection.TEACHER);
        StateView publicView = stateOf(round, Projection.PUBLIC);
        realtimeGateway.broadcastTeachersAfterCommit(sessionId, "QUIZ_STATE", teacher);
        realtimeGateway.broadcastParticipantsAfterCommit(sessionId, "QUIZ_STATE", publicView);
        realtimeGateway.broadcastProjectorsAfterCommit(sessionId, "QUIZ_STATE", publicView);
    }

    private Optional<QuizRound> latestRound(UUID sessionId) {
        return roundRepository.findBySessionIdOrderByCreatedAtDesc(sessionId).stream().findFirst();
    }

    private QuizRound lockRound(UUID sessionId, UUID roundId) {
        QuizRound round = roundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz não encontrado."));
        if (!round.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("O Quiz não pertence à sessão informada.");
        }
        return round;
    }

    private ClassSession getSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private static void ensureActive(ClassSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
    }

    private static void ensureQuestionBelongsToSessionClassroom(
            ClassSession session,
            ActivityQuestion question
    ) {
        if (!question.getActivity().getClassroom().getId().equals(session.getClassroom().getId())) {
            throw new IllegalArgumentException("A questão não pertence à turma desta sessão.");
        }
    }

    private void validateQuestion(ActivityQuestion question) {
        if (!SUPPORTED_TYPES.contains(question.getType())) {
            throw new IllegalArgumentException(
                    "O Quiz MVP suporta apenas questões de múltipla escolha ou verdadeiro/falso."
            );
        }

        if (question.getType() == QuestionType.MULTIPLE_CHOICE) {
            List<QuestionOptionView> options = questionOptions(question);
            Object correct = readJsonValue(question.getAnswerJson());
            if (options.isEmpty() || !(correct instanceof String selected)
                    || options.stream().noneMatch(option -> option.id().equals(selected))) {
                throw new IllegalArgumentException("A questão de múltipla escolha possui contrato inválido.");
            }
        }

        if (question.getType() == QuestionType.TRUE_FALSE
                && !(readJsonValue(question.getAnswerJson()) instanceof Boolean)) {
            throw new IllegalArgumentException("A questão verdadeiro/falso possui contrato inválido.");
        }
    }

    private String normalizeAnswer(ActivityQuestion question, Object rawAnswer) {
        if (question.getType() == QuestionType.MULTIPLE_CHOICE) {
            if (!(rawAnswer instanceof String selected) || selected.isBlank()) {
                throw new IllegalArgumentException("Selecione uma alternativa válida.");
            }
            boolean valid = questionOptions(question).stream()
                    .anyMatch(option -> option.id().equals(selected));
            if (!valid) throw new IllegalArgumentException("Alternativa inválida para este Quiz.");
            return writeJsonValue(selected);
        }

        if (question.getType() == QuestionType.TRUE_FALSE) {
            if (!(rawAnswer instanceof Boolean)) {
                throw new IllegalArgumentException("Informe verdadeiro ou falso.");
            }
            return writeJsonValue(rawAnswer);
        }

        throw new IllegalArgumentException("Tipo de questão não suportado pelo Quiz MVP.");
    }

    private List<QuestionOptionView> questionOptions(ActivityQuestion question) {
        if (question.getType() == QuestionType.TRUE_FALSE) {
            return List.of(
                    new QuestionOptionView("true", "Verdadeiro"),
                    new QuestionOptionView("false", "Falso")
            );
        }
        if (question.getOptionsJson() == null || question.getOptionsJson().isBlank()) return List.of();
        try {
            List<QuestionOptionView> options = json.readValue(
                    question.getOptionsJson(),
                    new TypeReference<List<QuestionOptionView>>() {}
            );
            return options == null ? List.of() : options;
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private String canonicalOptionAnswer(QuestionType type, String optionId) {
        return type == QuestionType.TRUE_FALSE
                ? writeJsonValue(Boolean.parseBoolean(optionId))
                : writeJsonValue(optionId);
    }

    private String writeJsonValue(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("A resposta não pôde ser serializada.");
        }
    }

    private Object readJsonValue(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return json.readValue(value, Object.class);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private enum Projection { TEACHER, PUBLIC }

    private record EvaluationSummary(
            int evaluatedAnswers,
            int correctAnswers,
            int awardedXp
    ) {}

    public record StateView(RoundView round) {
        public static StateView empty() { return new StateView(null); }
    }

    public record RoundView(
            UUID id,
            UUID sessionId,
            QuizStatus status,
            QuestionView question,
            int totalAnswers,
            boolean publicResultsVisible,
            List<DistributionView> distribution,
            Object correctAnswer,
            Instant openedAt,
            Instant lockedAt,
            Instant revealedAt,
            Instant closedAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record QuestionView(
            UUID id,
            QuestionType type,
            String statement,
            int points,
            List<QuestionOptionView> options,
            String code,
            String language
    ) {}

    public record QuestionOptionView(String id, String text) {}

    public record DistributionView(
            String optionId,
            String label,
            Integer answerCount,
            Double percentage
    ) {}

    public record ParticipantStateView(
            UUID roundId,
            QuizStatus status,
            boolean canAnswer,
            boolean answered,
            Object answer,
            boolean resultsVisible,
            Object correctAnswer,
            Instant submittedAt,
            Instant updatedAt
    ) {
        public static ParticipantStateView empty() {
            return new ParticipantStateView(null, null, false, false, null, false, null, null, null);
        }
    }
}
