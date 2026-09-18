
package br.com.arenadev.submission;
import br.com.arenadev.activity.ActivityRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
class LearningPlatformIntegrationServiceTest {
    @Test void supportsNoInstalledGatewayWithoutBreakingTheDomain() {
        var service = new LearningPlatformIntegrationService(mock(ActivityRepository.class), mock(ActivitySubmissionRepository.class),
                mock(SubmissionAssessmentRepository.class), mock(ActivityProviderLinkRepository.class), mock(SubmissionProviderLinkRepository.class), List.of());
        assertThat(service).isNotNull();
    }
    @Test void submissionSourceAlreadySupportsExternalOrigins() {
        assertThat(SubmissionSource.values()).contains(
                SubmissionSource.ARENA,
                SubmissionSource.EXTERNAL,
                SubmissionSource.IMPORT,
                SubmissionSource.TEAMS,
                SubmissionSource.GOOGLE_CLASSROOM
        );
    }
}
