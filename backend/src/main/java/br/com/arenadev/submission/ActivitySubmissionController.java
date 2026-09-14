package br.com.arenadev.submission;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions")
public class ActivitySubmissionController {

    private final ActivitySubmissionService service;
    private final SubmissionItemService itemService;
    private final JsonMapper json = JsonMapper.builder().build();

    public ActivitySubmissionController(
            ActivitySubmissionService service,
            SubmissionItemService itemService
    ) {
        this.service = service;
        this.itemService = itemService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubmissionResponse start(
            @PathVariable UUID activityId,
            @RequestBody StartSubmissionRequest request
    ) {
        return SubmissionResponse.from(
                service.start(activityId, request.enrollmentId())
        );
    }

    @GetMapping
    public List<SubmissionResponse> list(
            @PathVariable UUID activityId
    ) {
        return service.list(activityId)
                .stream()
                .map(SubmissionResponse::from)
                .toList();
    }

    @GetMapping("/{submissionId}")
    public SubmissionDetailResponse get(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        ActivitySubmission submission =
                service.get(activityId, submissionId);

        return detail(
                submission,
                itemService.list(activityId, submissionId)
        );
    }

    @PutMapping("/{submissionId}/items/{itemId}")
    public SubmissionItemResponse saveItem(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @PathVariable UUID itemId,
            @RequestBody SaveSubmissionItemRequest request
    ) {
        SubmissionItem item = itemService.saveItem(
                activityId,
                submissionId,
                itemId,
                new SubmissionItemService.SaveItem(
                        request.kind(),
                        request.questionId(),
                        request.position(),
                        request.content()
                )
        );

        return item(item);
    }

    @DeleteMapping("/{submissionId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @PathVariable UUID itemId
    ) {
        itemService.deleteItem(
                activityId,
                submissionId,
                itemId
        );
    }

    @PostMapping("/{submissionId}/submit")
    public SubmissionDetailResponse submit(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        ActivitySubmission submission =
                itemService.submit(activityId, submissionId);

        return detail(
                submission,
                itemService.list(activityId, submissionId)
        );
    }

    private SubmissionDetailResponse detail(
            ActivitySubmission submission,
            List<SubmissionItem> items
    ) {
        return new SubmissionDetailResponse(
                SubmissionResponse.from(submission),
                items.stream()
                        .map(this::item)
                        .toList()
        );
    }

    private SubmissionItemResponse item(
            SubmissionItem item
    ) {
        Object content;

        try {
            content = json.readValue(
                    item.getContentJson(),
                    Object.class
            );
        } catch (RuntimeException error) {
            content = item.getContentJson();
        }

        return new SubmissionItemResponse(
                item.getId(),
                item.getKind(),
                item.getQuestion() == null
                        ? null
                        : item.getQuestion().getId(),
                item.getPosition(),
                content,
                item.getCreatedAt(),
                item.getUpdatedAt(),
                item.getVersion()
        );
    }

    public record StartSubmissionRequest(
            UUID enrollmentId
    ) {}

    public record SaveSubmissionItemRequest(
            SubmissionItemKind kind,
            UUID questionId,
            int position,
            Object content
    ) {}

    public record SubmissionDetailResponse(
            SubmissionResponse submission,
            List<SubmissionItemResponse> items
    ) {}

    public record SubmissionItemResponse(
            UUID id,
            SubmissionItemKind kind,
            UUID questionId,
            int position,
            Object content,
            Instant createdAt,
            Instant updatedAt,
            long version
    ) {}

    public record SubmissionResponse(
            UUID id,
            UUID activityId,
            UUID enrollmentId,
            ActivitySubmissionStatus status,
            SubmissionSource source,
            int attemptNumber,
            Instant startedAt,
            Instant submittedAt,
            Instant returnedAt,
            Instant createdAt,
            Instant updatedAt,
            long version
    ) {
        static SubmissionResponse from(
                ActivitySubmission submission
        ) {
            return new SubmissionResponse(
                    submission.getId(),
                    submission.getActivity().getId(),
                    submission.getEnrollment().getId(),
                    submission.getStatus(),
                    submission.getSource(),
                    submission.getAttemptNumber(),
                    submission.getStartedAt(),
                    submission.getSubmittedAt(),
                    submission.getReturnedAt(),
                    submission.getCreatedAt(),
                    submission.getUpdatedAt(),
                    submission.getVersion()
            );
        }
    }
}
