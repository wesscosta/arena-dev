package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import br.com.arenadev.integration.persistence.ExternalStudentLinkEntity;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MicrosoftSubmissionTrackingService {
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;
    private final ExternalActivityLinkRepository activityLinks;
    private final ExternalStudentLinkRepository studentLinks;
    private final ExternalSubmissionLinkRepository submissionLinks;
    private final ActivityRepository activities;
    private final EnrollmentRepository enrollments;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient graph;

    public MicrosoftSubmissionTrackingService(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks,
            ExternalActivityLinkRepository activityLinks,
            ExternalStudentLinkRepository studentLinks,
            ExternalSubmissionLinkRepository submissionLinks,
            ActivityRepository activities,
            EnrollmentRepository enrollments,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient graph
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
        this.activityLinks = activityLinks;
        this.studentLinks = studentLinks;
        this.submissionLinks = submissionLinks;
        this.activities = activities;
        this.enrollments = enrollments;
        this.tokenProvider = tokenProvider;
        this.graph = graph;
    }

    @Transactional(readOnly = true)
    public TrackingResult track(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId
    ) {
        var connection = connections.required(connectionId);
        if (connection.getProvider() != LearningPlatformProvider.MICROSOFT_TEAMS) {
            throw new IllegalArgumentException(
                    "A conexão informada não pertence ao provider MICROSOFT_TEAMS."
            );
        }
        if (connection.getStatus() != IntegrationConnectionStatus.ACTIVE) {
            throw new IllegalStateException(
                    "A conexão Microsoft precisa estar ACTIVE."
            );
        }

        var classroomLink = classroomLinks.findById(classroomLinkId)
                .filter(link -> link.getConnectionId().equals(connectionId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de turma Microsoft não encontrado nesta conexão."
                ));

        var activityLink = activityLinks.findById(activityLinkId)
                .filter(link -> link.getConnectionId().equals(connectionId))
                .filter(link -> link.getExternalClassroomLinkId().equals(classroomLinkId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de atividade Microsoft não encontrado nesta turma."
                ));

        var activity = activities.findById(activityLink.getActivityId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Atividade Arena não encontrada: " + activityLink.getActivityId()
                ));

        String tenantId = required(
                connection.getExternalTenantId(),
                "tenantId da conexão Microsoft"
        );

        var token = tokenProvider.acquire(tenantId);
        var submissions = graph.listAssignmentSubmissions(
                token.token(),
                classroomLink.getExternalClassroomId(),
                activityLink.getExternalActivityId()
        );

        Map<String, ExternalStudentLinkEntity> studentByExternalId =
                studentLinks
                        .findByConnectionIdAndExternalClassroomLinkId(
                                connectionId,
                                classroomLinkId
                        )
                        .stream()
                        .collect(Collectors.toMap(
                                ExternalStudentLinkEntity::getExternalUserId,
                                Function.identity(),
                                (left, right) -> left
                        ));

        var items = submissions.stream()
                .map(submission -> toItem(
                        connectionId,
                        submission,
                        studentByExternalId.get(submission.recipientUserId())
                ))
                .sorted(Comparator.comparing(
                        TrackingItem::studentName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)
                ))
                .toList();

        return new TrackingResult(
                connectionId,
                classroomLinkId,
                activityLinkId,
                activity.getId(),
                activity.getTitle(),
                activityLink.getExternalActivityId(),
                items,
                count(items, MicrosoftSubmissionDeliveryStatus.DELIVERED),
                count(items, MicrosoftSubmissionDeliveryStatus.PENDING),
                count(items, MicrosoftSubmissionDeliveryStatus.EXCUSED),
                count(items, MicrosoftSubmissionDeliveryStatus.UNMATCHED)
        );
    }

    private TrackingItem toItem(
            UUID connectionId,
            MicrosoftEducationSubmission submission,
            ExternalStudentLinkEntity studentLink
    ) {
        var imported = submissionLinks
                .findByConnectionIdAndExternalSubmissionId(
                        connectionId,
                        submission.id()
                )
                .orElse(null);

        if (studentLink == null) {
            return new TrackingItem(
                    submission.id(),
                    submission.recipientUserId(),
                    null,
                    null,
                    null,
                    submission.status(),
                    MicrosoftSubmissionDeliveryStatus.UNMATCHED,
                    submission.submittedDateTime(),
                    submission.returnedDateTime(),
                    submission.webUrl(),
                    imported == null ? null : imported.getSubmissionId()
            );
        }

        var enrollment = enrollments.findById(studentLink.getEnrollmentId()).orElse(null);
        String studentName = enrollment == null
                ? null
                : enrollment.getStudent().getName();

        return new TrackingItem(
                submission.id(),
                submission.recipientUserId(),
                studentLink.getId(),
                studentLink.getEnrollmentId(),
                studentName,
                submission.status(),
                classify(submission.status()),
                submission.submittedDateTime(),
                submission.returnedDateTime(),
                submission.webUrl(),
                imported == null ? null : imported.getSubmissionId()
        );
    }

    private static MicrosoftSubmissionDeliveryStatus classify(String status) {
        if (status == null) {
            return MicrosoftSubmissionDeliveryStatus.PENDING;
        }
        return switch (status.toLowerCase()) {
            case "submitted", "returned" -> MicrosoftSubmissionDeliveryStatus.DELIVERED;
            case "excused" -> MicrosoftSubmissionDeliveryStatus.EXCUSED;
            case "working", "reassigned" -> MicrosoftSubmissionDeliveryStatus.PENDING;
            default -> MicrosoftSubmissionDeliveryStatus.PENDING;
        };
    }

    private static long count(
            List<TrackingItem> items,
            MicrosoftSubmissionDeliveryStatus status
    ) {
        return items.stream()
                .filter(item -> item.deliveryStatus() == status)
                .count();
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " é obrigatório.");
        }
        return value.trim();
    }

    public record TrackingItem(
            String microsoftSubmissionId,
            String microsoftUserId,
            UUID externalStudentLinkId,
            UUID enrollmentId,
            String studentName,
            String microsoftStatus,
            MicrosoftSubmissionDeliveryStatus deliveryStatus,
            OffsetDateTime submittedDateTime,
            OffsetDateTime returnedDateTime,
            String webUrl,
            UUID localSubmissionId
    ) {}

    public record TrackingResult(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            UUID activityId,
            String activityTitle,
            String microsoftAssignmentId,
            List<TrackingItem> items,
            long delivered,
            long pending,
            long excused,
            long unmatched
    ) {
        public TrackingResult {
            items = List.copyOf(items);
        }
    }
}
