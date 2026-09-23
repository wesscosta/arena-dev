package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class MicrosoftSubmissionOutcomePreviewService {
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;
    private final ExternalActivityLinkRepository activityLinks;
    private final ExternalSubmissionLinkRepository submissionLinks;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient graph;

    public MicrosoftSubmissionOutcomePreviewService(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks,
            ExternalActivityLinkRepository activityLinks,
            ExternalSubmissionLinkRepository submissionLinks,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient graph
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
        this.activityLinks = activityLinks;
        this.submissionLinks = submissionLinks;
        this.tokenProvider = tokenProvider;
        this.graph = graph;
    }

    @Transactional(readOnly = true)
    public OutcomePreview preview(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            String microsoftSubmissionId
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

        String externalSubmissionId = required(
                microsoftSubmissionId,
                "microsoftSubmissionId"
        );

        var submissionLink = submissionLinks
                .findByConnectionIdAndExternalSubmissionId(
                        connectionId,
                        externalSubmissionId
                )
                .filter(link -> link.getExternalActivityLinkId().equals(activityLinkId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Importe a entrega para o Arena antes de consultar sua avaliação externa."
                ));

        String tenantId = required(
                connection.getExternalTenantId(),
                "tenantId da conexão Microsoft"
        );

        var token = tokenProvider.acquire(tenantId);
        List<MicrosoftEducationOutcome> outcomes = graph.listSubmissionOutcomes(
                token.token(),
                classroomLink.getExternalClassroomId(),
                activityLink.getExternalActivityId(),
                externalSubmissionId
        );

        var points = outcomes.stream()
                .filter(item -> item.type() != null && item.type().endsWith("educationPointsOutcome"))
                .findFirst()
                .orElse(null);

        var feedback = outcomes.stream()
                .filter(item -> item.type() != null && item.type().endsWith("educationFeedbackOutcome"))
                .findFirst()
                .orElse(null);

        OffsetDateTime lastModified = outcomes.stream()
                .map(MicrosoftEducationOutcome::lastModifiedDateTime)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return new OutcomePreview(
                connectionId,
                classroomLinkId,
                activityLinkId,
                submissionLink.getSubmissionId(),
                externalSubmissionId,
                points == null ? null : points.points(),
                points == null ? null : points.publishedPoints(),
                feedback == null ? null : feedback.feedback(),
                feedback == null ? null : feedback.publishedFeedback(),
                lastModified,
                outcomes.isEmpty()
        );
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " é obrigatório.");
        }
        return value.trim();
    }

    public record OutcomePreview(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            UUID localSubmissionId,
            String microsoftSubmissionId,
            BigDecimal points,
            BigDecimal publishedPoints,
            String feedback,
            String publishedFeedback,
            OffsetDateTime lastModifiedDateTime,
            boolean empty
    ) {}
}
