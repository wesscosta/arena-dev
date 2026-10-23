package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/join/{code}/activities")
public class ParticipantSubmissionController {

    private final SessionJoinService joinService;
    private final ActivityRepository activityRepository;
    private final ActivityQuestionRepository questionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ActivitySubmissionRepository submissionRepository;
    private final ActivitySubmissionService submissionService;
    private final SubmissionItemService itemService;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final OptionIdCipher optionIds;
    private final JsonMapper json;

    public ParticipantSubmissionController(
            SessionJoinService joinService,
            ActivityRepository activityRepository,
            ActivityQuestionRepository questionRepository,
            EnrollmentRepository enrollmentRepository,
            ActivitySubmissionRepository submissionRepository,
            ActivitySubmissionService submissionService,
            SubmissionItemService itemService,
            SubmissionAssessmentRepository assessmentRepository,
            OptionIdCipher optionIds,
            JsonMapper json
    ) {
        this.joinService = joinService;
        this.activityRepository = activityRepository;
        this.questionRepository = questionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
        this.itemService = itemService;
        this.assessmentRepository = assessmentRepository;
        this.optionIds = optionIds;
        this.json = json;
    }

    @GetMapping
    public List<ActivityCard> list(
            @PathVariable String code,
            @RequestHeader("X-Participant-Token") String token
    ) {
        ParticipantContext ctx = participant(code, token);
        return activityRepository.findByClassroomIdOrderByUpdatedAtDesc(ctx.enrollment().getClassroom().getId())
                .stream()
                .map(activity -> card(activity, ctx.enrollment()))
                .toList();
    }

    @PostMapping("/{activityId}/start")
    public ActivityCard start(
            @PathVariable String code,
            @PathVariable UUID activityId,
            @RequestHeader("X-Participant-Token") String token
    ) {
        ParticipantContext ctx = participant(code, token);
        requireActivityInClassroom(activityId, ctx.enrollment());
        submissionService.start(activityId, ctx.enrollment().getId());
        return card(activityRepository.findById(activityId).orElseThrow(), ctx.enrollment());
    }

    @PutMapping("/{activityId}/submissions/{submissionId}/items/{itemId}")
    public ActivityCard saveItem(
            @PathVariable String code,
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @PathVariable UUID itemId,
            @RequestHeader("X-Participant-Token") String token,
            @RequestBody SaveItemRequest request
    ) {
        ParticipantContext ctx = participant(code, token);
        requireOwnSubmission(activityId, submissionId, ctx.enrollment());
        itemService.saveItem(
                activityId,
                submissionId,
                itemId,
                new SubmissionItemService.SaveItem(
                        request.kind(), request.questionId(), request.position(),
                        originalContent(activityId, submissionId, request)
                )
        );
        return card(activityRepository.findById(activityId).orElseThrow(), ctx.enrollment());
    }

    @PostMapping("/{activityId}/submissions/{submissionId}/submit")
    public ActivityCard submit(
            @PathVariable String code,
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @RequestHeader("X-Participant-Token") String token
    ) {
        ParticipantContext ctx = participant(code, token);
        requireOwnSubmission(activityId, submissionId, ctx.enrollment());
        itemService.submit(activityId, submissionId);
        return card(activityRepository.findById(activityId).orElseThrow(), ctx.enrollment());
    }

    private ActivityCard card(Activity activity, Enrollment enrollment) {
        ActivitySubmission submission = submissionRepository
                .findByActivityIdAndEnrollmentIdAndAttemptNumber(activity.getId(), enrollment.getId(), 1)
                .orElse(null);

        List<ActivityQuestion> questions = questionRepository.findByActivityIdOrderByPositionAsc(activity.getId());
        Map<UUID, ActivityQuestion> questionById = new LinkedHashMap<>();
        for (ActivityQuestion question : questions) questionById.put(question.getId(), question);

        List<SubmissionItemView> items = submission == null
                ? List.of()
                : itemService.list(activity.getId(), submission.getId()).stream()
                        .map(item -> item(item, questionById, submission.getId()))
                        .toList();

        SubmissionAssessment assessment = submission == null
                ? null
                : assessmentRepository.findBySubmissionId(submission.getId()).orElse(null);

        return new ActivityCard(
                activity.getId(),
                activity.getTitle(),
                activity.getTopic(),
                activity.getPoints(),
                activity.getOnTimeBonus(),
                questions.stream()
                        .map(question -> question(question, submission == null ? null : submission.getId()))
                        .toList(),
                submission == null ? null : submission.getId(),
                submission == null ? "NOT_STARTED" : submission.getStatus().name(),
                submission == null ? null : submission.getStartedAt(),
                submission == null ? null : submission.getSubmittedAt(),
                items,
                assessment == null ? null : assessment.getPublishedFeedback(),
                assessment == null ? null : assessment.getFeedbackPublishedAt()
        );
    }

    /**
     * Alternativas só seguem depois de iniciada a tentativa, e com ids opacos
     * dela; o runner chama start antes de abrir a atividade.
     */
    private QuestionView question(ActivityQuestion q, UUID submissionId) {
        List<Map<String, Object>> options = null;
        if (submissionId != null) {
            options = options(q).stream()
                    .map(option -> {
                        Map<String, Object> view = new LinkedHashMap<>();
                        view.put("id", optionIds.opaque(submissionId, q.getId(), option.id()));
                        view.put("text", option.text());
                        return view;
                    })
                    .toList();
        }
        return new QuestionView(
                q.getId(),
                q.getType().name(),
                q.getStatement(),
                q.getPoints(),
                q.getPosition(),
                options == null || options.isEmpty() ? null : options,
                q.getCode(),
                q.getLanguage()
        );
    }

    private SubmissionItemView item(SubmissionItem item, Map<UUID, ActivityQuestion> questionById, UUID submissionId) {
        Object content = readJson(item.getContentJson());
        UUID questionId = item.getQuestion() == null ? null : item.getQuestion().getId();
        ActivityQuestion question = questionId == null ? null : questionById.get(questionId);
        if (question != null && content instanceof Map<?, ?> map && map.get("value") instanceof String value) {
            boolean isOption = options(question).stream().anyMatch(option -> option.id().equals(value));
            if (isOption) {
                Map<Object, Object> opaque = new LinkedHashMap<>(map);
                opaque.put("value", optionIds.opaque(submissionId, question.getId(), value));
                content = opaque;
            }
        }
        return new SubmissionItemView(
                item.getId(),
                item.getKind(),
                questionId,
                item.getPosition(),
                content,
                item.getUpdatedAt()
        );
    }

    /**
     * Em questão com alternativas, o participante responde com o id opaco da
     * tentativa; o que se grava é o id original. Valor vazio limpa a resposta.
     */
    private Object originalContent(UUID activityId, UUID submissionId, SaveItemRequest request) {
        if (request.kind() != SubmissionItemKind.QUESTION_RESPONSE || request.questionId() == null) {
            return request.content();
        }
        ActivityQuestion question = questionRepository.findById(request.questionId())
                .filter(found -> found.getActivity().getId().equals(activityId))
                .orElse(null);
        if (question == null) return request.content();
        List<OptionView> options = options(question);
        if (options.isEmpty()) return request.content();

        if (!(request.content() instanceof Map<?, ?> map) || !(map.get("value") instanceof String value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resposta inválida para esta questão.");
        }
        if (value.isEmpty()) return request.content();
        String original = optionIds.original(
                        submissionId, question.getId(), options.stream().map(OptionView::id).toList(), value)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Alternativa não pertence a esta questão."));
        Map<Object, Object> content = new LinkedHashMap<>(map);
        content.put("value", original);
        return content;
    }

    private List<OptionView> options(ActivityQuestion question) {
        if (!(readJson(question.getOptionsJson()) instanceof List<?> raw)) return List.of();
        return raw.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .filter(option -> option.get("id") != null)
                .map(option -> new OptionView(
                        String.valueOf(option.get("id")),
                        String.valueOf(Objects.requireNonNullElse(
                                option.get("text"), Objects.requireNonNullElse(option.get("label"), option.get("id"))))
                ))
                .toList();
    }

    private Object readJson(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return json.readValue(value, Object.class);
        } catch (RuntimeException error) {
            return value;
        }
    }

    private ParticipantContext participant(String code, String token) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(session.sessionId(), token);
        Enrollment enrollment = enrollmentRepository
                .findByClassroomIdAndStudentId(session.classroomId(), participant.getStudent().getId())
                .filter(Enrollment::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Matrícula ativa não encontrada."));
        return new ParticipantContext(participant, enrollment);
    }

    private void requireActivityInClassroom(UUID activityId, Enrollment enrollment) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Atividade não encontrada."));
        if (!activity.getClassroom().getId().equals(enrollment.getClassroom().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Atividade não pertence à turma do participante.");
        }
    }

    private void requireOwnSubmission(UUID activityId, UUID submissionId, Enrollment enrollment) {
        ActivitySubmission submission = submissionService.get(activityId, submissionId);
        if (!submission.getEnrollment().getId().equals(enrollment.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Entrega não pertence ao participante autenticado.");
        }
    }

    private record ParticipantContext(SessionParticipant participant, Enrollment enrollment) {}

    private record OptionView(String id, String text) {}

    public record SaveItemRequest(SubmissionItemKind kind, UUID questionId, int position, Object content) {}

    public record ActivityCard(
            UUID id,
            String title,
            String topic,
            int points,
            int onTimeBonus,
            List<QuestionView> questions,
            UUID submissionId,
            String submissionStatus,
            Instant startedAt,
            Instant submittedAt,
            List<SubmissionItemView> items,
            String publishedFeedback,
            Instant feedbackPublishedAt
    ) {}

    public record QuestionView(
            UUID id,
            String type,
            String statement,
            int points,
            int position,
            Object options,
            String code,
            String language
    ) {}

    public record SubmissionItemView(
            UUID id,
            SubmissionItemKind kind,
            UUID questionId,
            int position,
            Object content,
            Instant updatedAt
    ) {}
}
