package br.com.arenadev.integration.api;

import br.com.arenadev.integration.application.*;
import br.com.arenadev.integration.domain.*;
import br.com.arenadev.integration.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationAdminController {
    private final IntegrationConnectionService connections;
    private final ExternalLinkService links;
    private final SyncExecutionService sync;
    private final SyncCheckpointService checkpoints;

    public IntegrationAdminController(
            IntegrationConnectionService connections,
            ExternalLinkService links,
            SyncExecutionService sync,
            SyncCheckpointService checkpoints
    ) {
        this.connections = connections;
        this.links = links;
        this.sync = sync;
        this.checkpoints = checkpoints;
    }

    @GetMapping("/connections")
    public List<ConnectionResponse> listConnections() {
        return connections.list().stream().map(ConnectionResponse::from).toList();
    }

    @GetMapping("/connections/{connectionId}")
    public ConnectionResponse getConnection(@PathVariable UUID connectionId) {
        return ConnectionResponse.from(connections.required(connectionId));
    }

    @PostMapping("/connections")
    public ResponseEntity<ConnectionResponse> createConnection(@RequestBody CreateConnectionRequest request) {
        var created = connections.create(request.provider(), request.displayName(), request.externalTenantId());
        return ResponseEntity.created(URI.create("/api/integrations/connections/" + created.getId()))
                .body(ConnectionResponse.from(created));
    }

    @PutMapping("/connections/{connectionId}/credential-reference")
    public ConnectionResponse attachCredentialReference(
            @PathVariable UUID connectionId,
            @RequestBody CredentialReferenceRequest request
    ) {
        return ConnectionResponse.from(
                connections.attachCredentialReference(connectionId, request.reference())
        );
    }

    @PostMapping("/connections/{connectionId}/activate")
    public ConnectionResponse activate(@PathVariable UUID connectionId) {
        return ConnectionResponse.from(connections.activate(connectionId));
    }

    @PostMapping("/connections/{connectionId}/disable")
    public ConnectionResponse disable(@PathVariable UUID connectionId) {
        return ConnectionResponse.from(connections.disable(connectionId));
    }

    @PostMapping("/connections/{connectionId}/classroom-links")
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomLinkResponse linkClassroom(
            @PathVariable UUID connectionId,
            @RequestBody LinkClassroomRequest request
    ) {
        return ClassroomLinkResponse.from(links.linkClassroom(
                connectionId, request.classroomId(), request.externalClassroomId(), request.externalWebUrl()
        ));
    }

    @PostMapping("/connections/{connectionId}/student-links")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentLinkResponse linkStudent(
            @PathVariable UUID connectionId,
            @RequestBody LinkStudentRequest request
    ) {
        return StudentLinkResponse.from(links.linkStudent(
                connectionId, request.externalClassroomLinkId(), request.enrollmentId(), request.externalUserId()
        ));
    }

    @PostMapping("/connections/{connectionId}/activity-links")
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityLinkResponse linkActivity(
            @PathVariable UUID connectionId,
            @RequestBody LinkActivityRequest request
    ) {
        return ActivityLinkResponse.from(links.linkActivity(
                connectionId,
                request.externalClassroomLinkId(),
                request.activityId(),
                request.externalActivityId(),
                request.externalWebUrl()
        ));
    }

    @PostMapping("/connections/{connectionId}/submission-links")
    @ResponseStatus(HttpStatus.CREATED)
    public SubmissionLinkResponse linkSubmission(
            @PathVariable UUID connectionId,
            @RequestBody LinkSubmissionRequest request
    ) {
        return SubmissionLinkResponse.from(links.linkSubmission(
                connectionId,
                request.externalActivityLinkId(),
                request.externalStudentLinkId(),
                request.submissionId(),
                request.externalSubmissionId()
        ));
    }

    @PostMapping("/connections/{connectionId}/sync-executions")
    @ResponseStatus(HttpStatus.CREATED)
    public SyncExecutionResponse beginSync(
            @PathVariable UUID connectionId,
            @RequestBody BeginSyncRequest request
    ) {
        return SyncExecutionResponse.from(sync.begin(connectionId, request.scope(), request.direction()));
    }

    @GetMapping("/sync-executions/{executionId}")
    public SyncExecutionResponse getSync(@PathVariable UUID executionId) {
        return SyncExecutionResponse.from(sync.get(executionId));
    }

    @PostMapping("/sync-executions/{executionId}/start")
    public SyncExecutionResponse startSync(@PathVariable UUID executionId) {
        return SyncExecutionResponse.from(sync.start(executionId));
    }

    @PostMapping("/sync-executions/{executionId}/succeed")
    public SyncExecutionResponse succeedSync(@PathVariable UUID executionId) {
        return SyncExecutionResponse.from(sync.succeed(executionId));
    }

    @PostMapping("/sync-executions/{executionId}/partial")
    public SyncExecutionResponse partialSync(
            @PathVariable UUID executionId,
            @RequestBody SummaryRequest request
    ) {
        return SyncExecutionResponse.from(sync.partiallySucceed(executionId, request.summary()));
    }

    @PostMapping("/sync-executions/{executionId}/fail")
    public SyncExecutionResponse failSync(
            @PathVariable UUID executionId,
            @RequestBody SummaryRequest request
    ) {
        return SyncExecutionResponse.from(sync.fail(executionId, request.summary()));
    }

    @PostMapping("/sync-executions/{executionId}/cancel")
    public SyncExecutionResponse cancelSync(@PathVariable UUID executionId) {
        return SyncExecutionResponse.from(sync.cancel(executionId));
    }

    @PostMapping("/sync-executions/{executionId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public SyncItemResponse registerItem(
            @PathVariable UUID executionId,
            @RequestBody RegisterSyncItemRequest request
    ) {
        return SyncItemResponse.from(sync.registerItem(executionId, request.itemType(), request.itemKey()));
    }

    @PostMapping("/sync-items/{itemId}/start")
    public SyncItemResponse startItem(@PathVariable UUID itemId) {
        return SyncItemResponse.from(sync.startItem(itemId));
    }

    @PostMapping("/sync-items/{itemId}/succeed")
    public SyncItemResponse succeedItem(@PathVariable UUID itemId) {
        return SyncItemResponse.from(sync.succeedItem(itemId));
    }

    @PostMapping("/sync-items/{itemId}/fail")
    public SyncItemResponse failItem(
            @PathVariable UUID itemId,
            @RequestBody SummaryRequest request
    ) {
        return SyncItemResponse.from(sync.failItem(itemId, request.summary()));
    }

    @GetMapping("/connections/{connectionId}/checkpoints/{scope}")
    public ResponseEntity<CheckpointResponse> getCheckpoint(
            @PathVariable UUID connectionId,
            @PathVariable String scope
    ) {
        return checkpoints.find(connectionId, scope)
                .map(CheckpointResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/connections/{connectionId}/checkpoints/{scope}")
    public CheckpointResponse saveCheckpoint(
            @PathVariable UUID connectionId,
            @PathVariable String scope,
            @RequestBody CheckpointRequest request
    ) {
        return CheckpointResponse.from(checkpoints.save(connectionId, scope, request.cursor()));
    }

    public record CreateConnectionRequest(
            LearningPlatformProvider provider,
            String displayName,
            String externalTenantId
    ) {}

    public record CredentialReferenceRequest(String reference) {}

    public record LinkClassroomRequest(
            UUID classroomId,
            String externalClassroomId,
            String externalWebUrl
    ) {}

    public record LinkStudentRequest(
            UUID externalClassroomLinkId,
            UUID enrollmentId,
            String externalUserId
    ) {}

    public record LinkActivityRequest(
            UUID externalClassroomLinkId,
            UUID activityId,
            String externalActivityId,
            String externalWebUrl
    ) {}

    public record LinkSubmissionRequest(
            UUID externalActivityLinkId,
            UUID externalStudentLinkId,
            UUID submissionId,
            String externalSubmissionId
    ) {}

    public record BeginSyncRequest(String scope, SyncDirection direction) {}
    public record RegisterSyncItemRequest(String itemType, String itemKey) {}
    public record SummaryRequest(String summary) {}
    public record CheckpointRequest(String cursor) {}

    public record ConnectionResponse(
            UUID id,
            LearningPlatformProvider provider,
            String displayName,
            String externalTenantId,
            IntegrationConnectionStatus status
    ) {
        static ConnectionResponse from(IntegrationConnectionEntity entity) {
            return new ConnectionResponse(
                    entity.getId(),
                    entity.getProvider(),
                    entity.getDisplayName(),
                    entity.getExternalTenantId(),
                    entity.getStatus()
            );
        }
    }

    public record ClassroomLinkResponse(
            UUID id, UUID connectionId, UUID classroomId,
            String externalClassroomId, String externalWebUrl
    ) {
        static ClassroomLinkResponse from(ExternalClassroomLinkEntity entity) {
            return new ClassroomLinkResponse(
                    entity.getId(), entity.getConnectionId(), entity.getClassroomId(),
                    entity.getExternalClassroomId(), entity.getExternalWebUrl()
            );
        }
    }

    public record StudentLinkResponse(
            UUID id, UUID connectionId, UUID externalClassroomLinkId,
            UUID enrollmentId, String externalUserId
    ) {
        static StudentLinkResponse from(ExternalStudentLinkEntity entity) {
            return new StudentLinkResponse(
                    entity.getId(), entity.getConnectionId(), entity.getExternalClassroomLinkId(),
                    entity.getEnrollmentId(), entity.getExternalUserId()
            );
        }
    }

    public record ActivityLinkResponse(
            UUID id, UUID connectionId, UUID externalClassroomLinkId,
            UUID activityId, String externalActivityId, String externalWebUrl
    ) {
        static ActivityLinkResponse from(ExternalActivityLinkEntity entity) {
            return new ActivityLinkResponse(
                    entity.getId(), entity.getConnectionId(), entity.getExternalClassroomLinkId(),
                    entity.getActivityId(), entity.getExternalActivityId(), entity.getExternalWebUrl()
            );
        }
    }

    public record SubmissionLinkResponse(
            UUID id, UUID connectionId, UUID externalActivityLinkId,
            UUID externalStudentLinkId, UUID submissionId, String externalSubmissionId
    ) {
        static SubmissionLinkResponse from(ExternalSubmissionLinkEntity entity) {
            return new SubmissionLinkResponse(
                    entity.getId(), entity.getConnectionId(), entity.getExternalActivityLinkId(),
                    entity.getExternalStudentLinkId(), entity.getSubmissionId(), entity.getExternalSubmissionId()
            );
        }
    }

    public record SyncExecutionResponse(
            UUID id, UUID connectionId, String scope,
            SyncDirection direction, SyncExecutionStatus status
    ) {
        static SyncExecutionResponse from(SyncExecutionEntity entity) {
            return new SyncExecutionResponse(
                    entity.getId(), entity.getConnectionId(), entity.getScope(),
                    entity.getDirection(), entity.getStatus()
            );
        }
    }

    public record SyncItemResponse(
            UUID id, UUID executionId, String itemType, String itemKey, SyncItemStatus status
    ) {
        static SyncItemResponse from(SyncItemEntity entity) {
            return new SyncItemResponse(
                    entity.getId(), entity.getExecutionId(), entity.getItemType(),
                    entity.getItemKey(), entity.getStatus()
            );
        }
    }

    public record CheckpointResponse(UUID connectionId, String scope, String cursor) {
        static CheckpointResponse from(SyncCheckpointEntity entity) {
            return new CheckpointResponse(
                    entity.getId().getConnectionId(),
                    entity.getId().getScope(),
                    entity.getCursor()
            );
        }
    }
}
