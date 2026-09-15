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
import java.util.List;
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
    private final JsonMapper json = JsonMapper.builder().build();

    public ParticipantSubmissionController(
            SessionJoinService joinService,
            ActivityRepository activityRepository,
            ActivityQuestionRepository questionRepository,
            EnrollmentRepository enrollmentRepository,
            ActivitySubmissionRepository submissionRepository,
            ActivitySubmissionService submissionService,
            SubmissionItemService itemService,
            SubmissionAssessmentRepository assessmentRepository
    ) {
        this.joinService = joinService;
        this.activityRepository = activityRepository;
        this.questionRepository = questionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
        this.itemService = itemService;
        this.assessmentRepository = assessmentRepository;
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
                        request.kind(), request.questionId(), request.position(), request.content()
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

        List<SubmissionItemView> items = submission == null
                ? List.of()
                : itemService.list(activity.getId(), submission.getId()).stream().map(this::item).toList();

        SubmissionAssessment assessment = submission == null
                ? null
                : assessmentRepository.findBySubmissionId(submission.getId()).orElse(null);

        return new ActivityCard(
                activity.getId(),
                activity.getTitle(),
                activity.getTopic(),
                activity.getPoints(),
                activity.getOnTimeBonus(),
                questionRepository.findByActivityIdOrderByPositionAsc(activity.getId()).stream().map(this::question).toList(),
                submission == null ? null : submission.getId(),
                submission == null ? "NOT_STARTED" : submission.getStatus().name(),
                submission == null ? null : submission.getStartedAt(),
                submission == null ? null : submission.getSubmittedAt(),
                items,
                assessment == null ? null : assessment.getPublishedFeedback(),
                assessment == null ? null : assessment.getFeedbackPublishedAt()
        );
    }

    private QuestionView question(ActivityQuestion q) {
        return new QuestionView(
                q.getId(),
                q.getType().name(),
                q.getStatement(),
                q.getPoints(),
                q.getPosition(),
                readJson(q.getOptionsJson()),
                q.getCode(),
                q.getLanguage()
        );
    }

    private SubmissionItemView item(SubmissionItem item) {
        return new SubmissionItemView(
                item.getId(),
                item.getKind(),
                item.getQuestion() == null ? null : item.getQuestion().getId(),
                item.getPosition(),
                readJson(item.getContentJson()),
                item.getUpdatedAt()
        );
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
