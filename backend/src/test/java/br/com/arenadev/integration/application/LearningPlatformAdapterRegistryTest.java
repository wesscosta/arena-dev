package br.com.arenadev.integration.application;

import br.com.arenadev.integration.application.port.LearningPlatformCapability;
import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.provider.FakeLearningPlatformAdapter;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LearningPlatformAdapterRegistryTest {

    @Test
    void resolvesAdapterByProviderAndConnection() {
        var teams = new FakeLearningPlatformAdapter(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                Set.of(LearningPlatformCapability.READ_CLASSROOM)
        );
        var google = new FakeLearningPlatformAdapter(
                LearningPlatformProvider.GOOGLE_CLASSROOM,
                Set.of(LearningPlatformCapability.READ_ROSTER)
        );

        var registry = new LearningPlatformAdapterRegistry(List.of(teams, google));

        assertThat(registry.required(LearningPlatformProvider.MICROSOFT_TEAMS)).isSameAs(teams);
        assertThat(registry.required(
                IntegrationConnection.draft(LearningPlatformProvider.GOOGLE_CLASSROOM, "Google", null)
        )).isSameAs(google);
    }

    @Test
    void rejectsDuplicateAdaptersForSameProvider() {
        var first = new FakeLearningPlatformAdapter(
                LearningPlatformProvider.MICROSOFT_TEAMS, Set.of()
        );
        var second = new FakeLearningPlatformAdapter(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                Set.of(LearningPlatformCapability.READ_CLASSROOM)
        );

        assertThatThrownBy(() -> new LearningPlatformAdapterRegistry(List.of(first, second)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MICROSOFT_TEAMS");
    }

    @Test
    void failsExplicitlyWhenProviderHasNoAdapter() {
        var registry = new LearningPlatformAdapterRegistry(List.of());

        assertThat(registry.hasAdapter(LearningPlatformProvider.GOOGLE_CLASSROOM)).isFalse();
        assertThatThrownBy(() -> registry.required(LearningPlatformProvider.GOOGLE_CLASSROOM))
                .isInstanceOf(IntegrationAdapterNotFoundException.class)
                .hasMessageContaining("GOOGLE_CLASSROOM");
    }
}
