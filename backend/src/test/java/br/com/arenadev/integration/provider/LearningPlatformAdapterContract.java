package br.com.arenadev.integration.provider;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

public abstract class LearningPlatformAdapterContract {

    protected abstract LearningPlatformAdapter adapter();
    protected abstract LearningPlatformProvider provider();
    protected abstract Set<LearningPlatformCapability> expectedCapabilities();

    @Test
    void exposesItsCanonicalProvider() {
        assertThat(adapter().provider()).isEqualTo(provider());
    }

    @Test
    void exposesOnlyDeclaredCapabilitiesForItsConnection() {
        var connection = IntegrationConnection.draft(provider(), "Contract Test", "tenant-contract");

        assertThat(adapter().capabilities(connection))
                .containsExactlyInAnyOrderElementsOf(expectedCapabilities());

        for (var capability : LearningPlatformCapability.values()) {
            assertThat(adapter().supports(connection, capability))
                    .isEqualTo(expectedCapabilities().contains(capability));
        }
    }

    @Test
    void neverSupportsAConnectionFromAnotherProvider() {
        var other = provider() == LearningPlatformProvider.MICROSOFT_TEAMS
                ? LearningPlatformProvider.GOOGLE_CLASSROOM
                : LearningPlatformProvider.MICROSOFT_TEAMS;

        var connection = IntegrationConnection.draft(other, "Wrong Provider", "tenant-other");

        for (var capability : LearningPlatformCapability.values()) {
            assertThat(adapter().supports(connection, capability)).isFalse();
        }
    }
}
