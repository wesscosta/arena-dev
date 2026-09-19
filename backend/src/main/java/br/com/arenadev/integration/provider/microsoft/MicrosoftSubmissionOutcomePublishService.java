package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.ExternalActivityLinkRepository;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import br.com.arenadev.integration.persistence.ExternalSubmissionLinkRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.submission.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class MicrosoftSubmissionOutcomePublishService {
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;
    private final ExternalActivityLinkRepository activityLinks;
    private final ExternalSubmissionLinkRepository submissionLinks;
    private final ActivitySubmissionRepository submissions;
    private final SubmissionAssessmentRepository assessments;
    private final AssessmentCriterionRepository criteria;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient graph;

    public MicrosoftSubmissionOutcomePublishService(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks,
            ExternalActivityLinkRepository activityLinks,
            ExternalSubmissionLinkRepository submissionLinks,
            ActivitySubmissionRepository submissions,
            SubmissionAssessmentRepository assessments,
            AssessmentCriterionRepository criteria,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient graph
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
        this.activityLinks = activityLinks;
        this.submissionLinks = submissionLinks;
        this.submissions = submissions;
        this.assessments = assessments;
        this.criteria = criteria;
        this.tokenProvider = tokenProvider;
        this.graph = graph;
    }

    @Transactional(readOnly = true)
    public PublishResult execute(
            UUID connectionId,
            UUID classroomLinkId,
            UUID activityLinkId,
            String microsoftSubmissionId,
            PublishAction action
    ) {
        if (action == null) {
            throw new IllegalArgumentException("action é obrigatória.");
        }

        var context = context(
                connectionId,
                classroomLinkId,
                activityLinkId,
                microsoftSubmissionId
        );

        return switch (action) {
            case PUSH_ASSESSMENT -> pushAssessment(context);
            case RETURN_TO_STUDENT -> returnToStudent(context);
        };
    }

    private PublishResult pushAssessment(Context context) {
        var submission = submissions.findById(context.localSubmissionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Entrega Arena vinculada não encontrada."
                ));

        if (submission.getStatus() != ActivitySubmissionStatus.GRADED
                && submission.getStatus() != ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException(
                    "Conclua a correção no Arena antes de enviar a avaliação ao Teams."
            );
        }

        var assessment = assessments.findBySubmissionId(submission.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Avaliação local não encontrada."
                ));

        List<AssessmentCriterion> criterionList = criteria
                .findByAssessmentIdOrderByPositionAsc(assessment.getId());

        if (criterionList.isEmpty()) {
            throw new IllegalStateException(
                    "A avaliação local não possui critérios pontuados."
            );
        }
        if (criterionList.stream().anyMatch(item -> item.getAwardedPoints() == null)) {
            throw new IllegalStateException(
                    "Pontue todos os critérios antes de enviar a nota ao Teams."
            );
        }

        BigDecimal totalPoints = criterionList.stream()
                .map(AssessmentCriterion::getAwardedPoints)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String feedback = firstText(
                assessment.getPublishedFeedback(),
                assessment.getFeedbackDraft()
        );

        var outcomes = graph.listSubmissionOutcomes(
                context.accessToken(),
                context.microsoftClassId(),
                context.microsoftAssignmentId(),
                context.microsoftSubmissionId()
        );

        var pointsOutcome = outcomes.stream()
                .filter(item -> item.type() != null
                        && item.type().endsWith("educationPointsOutcome"))
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "O Teams não retornou educationPointsOutcome para esta entrega."
                ));

        graph.updatePointsOutcome(
                context.accessToken(),
                context.microsoftClassId(),
                context.microsoftAssignmentId(),
                context.microsoftSubmissionId(),
                pointsOutcome.id(),
                totalPoints
        );

        boolean feedbackSent = false;
        if (feedback != null) {
            var feedbackOutcome = outcomes.stream()
                    .filter(item -> item.type() != null
                            && item.type().endsWith("educationFeedbackOutcome"))
                    .findFirst()
                    .orElseThrow(() -> new IntegrationNotFoundException(
                            "O Teams não retornou educationFeedbackOutcome para esta entrega."
                    ));

            graph.updateFeedbackOutcome(
                    context.accessToken(),
                    context.microsoftClassId(),
                    context.microsoftAssignmentId(),
                    context.microsoftSubmissionId(),
                    feedbackOutcome.id(),
                    feedback
            );
            feedbackSent = true;
        }

        return new PublishResult(
                context.localSubmissionId(),
                context.microsoftSubmissionId(),
                PublishAction.PUSH_ASSESSMENT,
                totalPoints,
                feedbackSent,
                false
        );
    }

    private PublishResult returnToStudent(Context context) {
        var submission = submissions.findById(context.localSubmissionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Entrega Arena vinculada não encontrada."
                ));

        if (submission.getStatus() != ActivitySubmissionStatus.GRADED
                && submission.getStatus() != ActivitySubmissionStatus.RETURNED) {
            throw new IllegalStateException(
                    "Conclua a correção no Arena antes de devolver a entrega no Teams."
            );
        }

        graph.returnSubmission(
                context.accessToken(),
                context.microsoftClassId(),
                context.microsoftAssignmentId(),
                context.microsoftSubmissionId()
        );

        return new PublishResult(
                context.localSubmissionId(),
                context.microsoftSubmissionId(),
                PublishAction.RETURN_TO_STUDENT,
                null,
                false,
                true
        );
    }

    private Context context(
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
                        "A entrega Microsoft não possui vínculo local válido."
                ));

        String tenantId = required(
                connection.getExternalTenantId(),
                "tenantId da conexão Microsoft"
        );
        var token = tokenProvider.acquire(tenantId);

        return new Context(
                submissionLink.getSubmissionId(),
                classroomLink.getExternalClassroomId(),
                activityLink.getExternalActivityId(),
                externalSubmissionId,
                token.token()
        );
    }

    private static String firstText(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary.trim();
        if (fallback != null && !fallback.isBlank()) return fallback.trim();
        return null;
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " é obrigatório.");
        }
        return value.trim();
    }

    private record Context(
            UUID localSubmissionId,
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId,
            String accessToken
    ) {}

    public enum PublishAction {
        PUSH_ASSESSMENT,
        RETURN_TO_STUDENT
    }

    public record PublishResult(
            UUID localSubmissionId,
            String microsoftSubmissionId,
            PublishAction action,
            BigDecimal pointsSent,
            boolean feedbackSent,
            boolean returnedToStudent
    ) {}
}
