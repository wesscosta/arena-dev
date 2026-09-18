package br.com.arenadev.integration.domain;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.submission.SubmissionSource;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IntegrationDomainTest {

    @Test
    void providerUsesCanonicalMicrosoftNameWithoutLeakingGraph() {
        assertThat(LearningPlatformProvider.values())
                .containsExactly(
                        LearningPlatformProvider.MICROSOFT_TEAMS,
                        LearningPlatformProvider.GOOGLE_CLASSROOM
                );
    }

    @Test
    void connectionCannotBecomeActiveWithoutCredentialReference() {
        var connection = IntegrationConnection.draft(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac Piauí",
                "tenant-01"
        );

        assertThatThrownBy(() -> connection.activate(Instant.now()))
                .isInstanceOf(IllegalStateException.class);

        connection.attachCredentialReference("credential://integration/test", Instant.now());
        connection.activate(Instant.now());

        assertThat(connection.status()).isEqualTo(IntegrationConnectionStatus.ACTIVE);
    }

    @Test
    void externalSubmissionSourceIsProviderIndependent() {
        assertThat(SubmissionSource.values())
                .contains(SubmissionSource.ARENA, SubmissionSource.EXTERNAL, SubmissionSource.IMPORT);
    }

    @Test
    void syncExecutionDistinguishesPartialSuccess() {
        var execution = new SyncExecution(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "SUBMISSIONS",
                SyncDirection.IMPORT,
                Instant.now()
        );

        execution.start(Instant.now());
        execution.partiallySucceed("2 de 30 itens falharam.", Instant.now());

        assertThat(execution.status()).isEqualTo(SyncExecutionStatus.PARTIALLY_SUCCEEDED);
        assertThat(execution.errorSummary()).contains("2 de 30");
    }

    @Test
    void adapterCapabilitiesAreEvaluatedPerConnection() {
        var connection = IntegrationConnection.draft(
                LearningPlatformProvider.GOOGLE_CLASSROOM,
                "Workspace Escola",
                null
        );

        LearningPlatformAdapter adapter = new LearningPlatformAdapter() {
            @Override
            public LearningPlatformProvider provider() {
                return LearningPlatformProvider.GOOGLE_CLASSROOM;
            }

            @Override
            public Set<LearningPlatformCapability> capabilities(IntegrationConnection ignored) {
                return Set.of(
                        LearningPlatformCapability.READ_CLASSROOM,
                        LearningPlatformCapability.READ_ROSTER
                );
            }
        };

        assertThat(adapter.supports(connection, LearningPlatformCapability.READ_CLASSROOM)).isTrue();
        assertThat(adapter.supports(connection, LearningPlatformCapability.WRITE_GRADE)).isFalse();
    }

    @Test
    void linkIdentityIsScopedByConnectionInTheDomainContract() {
        UUID connectionId = UUID.randomUUID();
        var classroomLink = new ExternalClassroomLink(
                UUID.randomUUID(),
                connectionId,
                UUID.randomUUID(),
                "class-123",
                null
        );

        assertThat(classroomLink.connectionId()).isEqualTo(connectionId);
        assertThat(classroomLink.externalClassroomId()).isEqualTo("class-123");
    }
}
