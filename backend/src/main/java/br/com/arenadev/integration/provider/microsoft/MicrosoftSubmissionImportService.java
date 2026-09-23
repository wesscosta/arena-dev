package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkRepository;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import br.com.arenadev.submission.ActivitySubmission;
import br.com.arenadev.submission.ActivitySubmissionRepository;
import br.com.arenadev.submission.SubmissionSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class MicrosoftSubmissionImportService {
    private final MicrosoftSubmissionTrackingService tracking;
    private final ActivityRepository activities;
    private final EnrollmentRepository enrollments;
    private final ActivitySubmissionRepository submissions;
    private final ExternalActivityLinkRepository activityLinks;
    private final ExternalStudentLinkRepository studentLinks;
    private final ExternalSubmissionLinkRepository externalSubmissionLinks;
    private final ExternalLinkService externalLinks;

    public MicrosoftSubmissionImportService(
            MicrosoftSubmissionTrackingService tracking,
            ActivityRepository activities,
            EnrollmentRepository enrollments,
            ActivitySubmissionRepository submissions,
            ExternalActivityLinkRepository activityLinks,
            ExternalStudentLinkRepository studentLinks,
            ExternalSubmissionLinkRepository externalSubmissionLinks,
            ExternalLinkService externalLinks
    ) {
        this.tracking = tracking;
        this.activities = activities;
        this.enrollments = enrollments;
        this.submissions = submissions;
        this.activityLinks = activityLinks;
        this.studentLinks = studentLinks;
        this.externalSubmissionLinks = externalSubmissionLinks;
        this.externalLinks = externalLinks;
    }

    @Transactional
    public ImportResult importDelivered(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            String microsoftSubmissionId
    ) {
        String externalSubmissionId = required(
                microsoftSubmissionId,
                "microsoftSubmissionId"
        );

        var existingExternal = externalSubmissionLinks
                .findByConnectionIdAndExternalSubmissionId(
                        connectionId,
                        externalSubmissionId
                );

        if (existingExternal.isPresent()) {
            var link = existingExternal.get();
            var local = submissions.findById(link.getSubmissionId())
                    .orElseThrow(() -> new IntegrationNotFoundException(
                            "Vínculo externo aponta para uma entrega local inexistente."
                    ));
            return result(local, link.getId(), externalSubmissionId, false);
        }

        var snapshot = tracking.track(
                connectionId,
                classroomLinkId,
                activityLinkId
        );

        var item = snapshot.items().stream()
                .filter(candidate ->
                        candidate.microsoftSubmissionId().equals(externalSubmissionId)
                )
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Entrega Microsoft não encontrada na atividade vinculada."
                ));

        if (item.deliveryStatus() != MicrosoftSubmissionDeliveryStatus.DELIVERED) {
            throw new IllegalStateException(
                    "Somente entregas com status DELIVERED podem ser importadas."
            );
        }

        if (item.externalStudentLinkId() == null || item.enrollmentId() == null) {
            throw new IllegalStateException(
                    "A entrega precisa estar associada a um aluno local antes da importação."
            );
        }

        var activityLink = activityLinks.findById(activityLinkId)
                .filter(link -> link.getConnectionId().equals(connectionId))
                .filter(link -> link.getExternalClassroomLinkId().equals(classroomLinkId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de atividade Microsoft inválido."
                ));

        var studentLink = studentLinks.findById(item.externalStudentLinkId())
                .filter(link -> link.getConnectionId().equals(connectionId))
                .filter(link -> link.getEnrollmentId().equals(item.enrollmentId()))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de estudante Microsoft inválido."
                ));

        var activity = activities.findById(activityLink.getActivityId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Atividade Arena não encontrada."
                ));

        var enrollment = enrollments.findById(studentLink.getEnrollmentId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Matrícula Arena não encontrada."
                ));

        int attempt = nextAttemptNumber(activity.getId(), enrollment.getId());

        var submission = new ActivitySubmission(
                activity,
                enrollment,
                attempt,
                SubmissionSource.EXTERNAL
        );

        Instant submittedAt = instant(
                item.submittedDateTime(),
                item.returnedDateTime()
        );
        submission.submit(submittedAt);
        submission = submissions.save(submission);

        var externalLink = externalLinks.linkSubmission(
                connectionId,
                activityLinkId,
                studentLink.getId(),
                submission.getId(),
                externalSubmissionId
        );

        return result(
                submission,
                externalLink.getId(),
                externalSubmissionId,
                true
        );
    }

    private int nextAttemptNumber(UUID activityId, UUID enrollmentId) {
        return submissions.findByActivityIdOrderByUpdatedAtDesc(activityId)
                .stream()
                .filter(candidate ->
                        candidate.getEnrollment().getId().equals(enrollmentId)
                )
                .mapToInt(ActivitySubmission::getAttemptNumber)
                .max()
                .orElse(0) + 1;
    }

    private static Instant instant(
            OffsetDateTime submittedAt,
            OffsetDateTime returnedAt
    ) {
        if (submittedAt != null) return submittedAt.toInstant();
        if (returnedAt != null) return returnedAt.toInstant();
        return Instant.now();
    }

    private static ImportResult result(
            ActivitySubmission submission,
            UUID externalSubmissionLinkId,
            String externalSubmissionId,
            boolean changed
    ) {
        return new ImportResult(
                submission.getId(),
                externalSubmissionLinkId,
                externalSubmissionId,
                submission.getActivity().getId(),
                submission.getEnrollment().getId(),
                submission.getAttemptNumber(),
                submission.getSource().name(),
                submission.getStatus().name(),
                submission.getSubmittedAt(),
                changed
        );
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }

    public record ImportResult(
            UUID submissionId,
            UUID externalSubmissionLinkId,
            String microsoftSubmissionId,
            UUID activityId,
            UUID enrollmentId,
            int attemptNumber,
            String source,
            String status,
            Instant submittedAt,
            boolean changed
    ) {}
}
