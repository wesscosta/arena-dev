package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MicrosoftClassDiscoveryServiceTest {
    @Test
    void discoversClassesUsingTenantFromActiveTeamsConnection() {
        var connections=mock(IntegrationConnectionService.class);
        var tokens=mock(MicrosoftGraphTokenProvider.class);
        var graph=mock(MicrosoftGraphEducationClient.class);
        var id=UUID.randomUUID();
        var connection=new IntegrationConnectionEntity(
                id, LearningPlatformProvider.MICROSOFT_TEAMS, "Senac", "tenant-01",
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE, IntegrationConnectionStatus.ACTIVE,
                Instant.parse("2026-09-19T16:00:00Z")
        );
        when(connections.required(id)).thenReturn(connection);
        when(tokens.acquire("tenant-01")).thenReturn(new MicrosoftGraphAccessToken(
                "token-123", OffsetDateTime.parse("2026-09-19T18:00:00Z")
        ));
        when(graph.listClasses("token-123")).thenReturn(List.of(
                new MicrosoftEducationClass("class-1","TDS 2026","TDS-2026","sis-1","TDS",
                        "Técnico em Desenvolvimento de Sistemas",null)
        ));
        var service=new MicrosoftClassDiscoveryService(connections,tokens,graph);
        var result=service.discover(id);
        assertThat(result.connectionId()).isEqualTo(id);
        assertThat(result.tenantId()).isEqualTo("tenant-01");
        assertThat(result.classes()).hasSize(1);
        assertThat(result.classes().getFirst().id()).isEqualTo("class-1");
        verify(tokens).acquire("tenant-01");
        verify(graph).listClasses("token-123");
    }

    @Test
    void rejectsInactiveConnectionBeforeCallingMicrosoft() {
        var connections=mock(IntegrationConnectionService.class);
        var tokens=mock(MicrosoftGraphTokenProvider.class);
        var graph=mock(MicrosoftGraphEducationClient.class);
        var id=UUID.randomUUID();
        when(connections.required(id)).thenReturn(new IntegrationConnectionEntity(
                id, LearningPlatformProvider.MICROSOFT_TEAMS, "Senac", "tenant-01",
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE, IntegrationConnectionStatus.DISABLED,
                Instant.parse("2026-09-19T16:00:00Z")
        ));
        var service=new MicrosoftClassDiscoveryService(connections,tokens,graph);
        assertThatThrownBy(() -> service.discover(id)).isInstanceOf(IllegalStateException.class).hasMessageContaining("ACTIVE");
        verifyNoInteractions(tokens,graph);
    }
}
