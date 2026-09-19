package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftSubmissionOutcomePreviewServiceTest {
    @Test
    void readsPointsAndFeedbackWithoutChangingLocalAssessment() {
        UUID connectionId = UUID.randomUUID();
        UUID classroomLinkId = UUID.randomUUID();
        UUID activityLinkId = UUID.randomUUID();
        UUID localSubmissionId = UUID.randomUUID();

        var connections = mock(IntegrationConnectionService.class);
        var classroomLinks = mock(ExternalClassroomLinkRepository.class);
        var activityLinks = mock(ExternalActivityLinkRepository.class);
        var submissionLinks = mock(ExternalSubmissionLinkRepository.class);
        var tokenProvider = mock(MicrosoftGraphTokenProvider.class);
        var graph = mock(MicrosoftGraphEducationClient.class);

        var connection = mock(IntegrationConnectionEntity.class);
        when(connection.getProvider()).thenReturn(LearningPlatformProvider.MICROSOFT_TEAMS);
        when(connection.getStatus()).thenReturn(IntegrationConnectionStatus.ACTIVE);
        when(connection.getExternalTenantId()).thenReturn("tenant-1");
        when(connections.required(connectionId)).thenReturn(connection);

        var classroomLink = mock(ExternalClassroomLinkEntity.class);
        when(classroomLink.getConnectionId()).thenReturn(connectionId);
        when(classroomLink.getExternalClassroomId()).thenReturn("class-1");
        when(classroomLinks.findById(classroomLinkId)).thenReturn(Optional.of(classroomLink));

        var activityLink = mock(ExternalActivityLinkEntity.class);
        when(activityLink.getConnectionId()).thenReturn(connectionId);
        when(activityLink.getExternalClassroomLinkId()).thenReturn(classroomLinkId);
        when(activityLink.getExternalActivityId()).thenReturn("assignment-1");
        when(activityLinks.findById(activityLinkId)).thenReturn(Optional.of(activityLink));

        var submissionLink = mock(ExternalSubmissionLinkEntity.class);
        when(submissionLink.getExternalActivityLinkId()).thenReturn(activityLinkId);
        when(submissionLink.getSubmissionId()).thenReturn(localSubmissionId);
        when(submissionLinks.findByConnectionIdAndExternalSubmissionId(
                connectionId,
                "submission-1"
        )).thenReturn(Optional.of(submissionLink));

        when(tokenProvider.acquire("tenant-1"))
                .thenReturn(new MicrosoftGraphAccessToken(
                        "token",
                        OffsetDateTime.now().plusHours(1)
                ));

        when(graph.listSubmissionOutcomes(
                "token",
                "class-1",
                "assignment-1",
                "submission-1"
        )).thenReturn(List.of(
                new MicrosoftEducationOutcome(
                        "points-1",
                        "#microsoft.graph.educationPointsOutcome",
                        new BigDecimal("8.50"),
                        new BigDecimal("8.00"),
                        null,
                        null,
                        OffsetDateTime.parse("2026-09-19T18:00:00Z")
                ),
                new MicrosoftEducationOutcome(
                        "feedback-1",
                        "#microsoft.graph.educationFeedbackOutcome",
                        null,
                        null,
                        "Bom trabalho. Revise os testes.",
                        "Bom trabalho.",
                        OffsetDateTime.parse("2026-09-19T18:05:00Z")
                )
        ));

        var service = new MicrosoftSubmissionOutcomePreviewService(
                connections,
                classroomLinks,
                activityLinks,
                submissionLinks,
                tokenProvider,
                graph
        );

        var result = service.preview(
                connectionId,
                classroomLinkId,
                activityLinkId,
                "submission-1"
        );

        assertThat(result.localSubmissionId()).isEqualTo(localSubmissionId);
        assertThat(result.points()).isEqualByComparingTo("8.50");
        assertThat(result.publishedPoints()).isEqualByComparingTo("8.00");
        assertThat(result.feedback()).isEqualTo("Bom trabalho. Revise os testes.");
        assertThat(result.publishedFeedback()).isEqualTo("Bom trabalho.");
        assertThat(result.empty()).isFalse();
    }
}
