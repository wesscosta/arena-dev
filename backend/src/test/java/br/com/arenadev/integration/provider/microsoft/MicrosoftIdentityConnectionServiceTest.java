package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftIdentityConnectionServiceTest {

    @Test
    void validatesTokenAndEducationAccessBeforeActivatingConnection() {
        var settings = mock(MicrosoftGraphSettings.class);
        var tokens = mock(MicrosoftGraphTokenProvider.class);
        var probe = mock(MicrosoftGraphProbe.class);
        var connections = mock(IntegrationConnectionService.class);

        when(settings.configured()).thenReturn(true);
        when(tokens.acquire("tenant-01"))
                .thenReturn(new MicrosoftGraphAccessToken(
                        "test-token",
                        OffsetDateTime.parse("2026-09-18T22:00:00Z")
                ));

        var id = UUID.randomUUID();
        var draft = new IntegrationConnectionEntity(
                id,
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01",
                null,
                IntegrationConnectionStatus.DRAFT,
                Instant.parse("2026-09-18T20:00:00Z")
        );
        var attached = new IntegrationConnectionEntity(
                id,
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01",
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                IntegrationConnectionStatus.DRAFT,
                Instant.parse("2026-09-18T20:00:00Z")
        );
        var active = new IntegrationConnectionEntity(
                id,
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01",
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE,
                IntegrationConnectionStatus.ACTIVE,
                Instant.parse("2026-09-18T20:00:00Z")
        );

        when(connections.create(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01"
        )).thenReturn(draft);
        when(connections.attachCredentialReference(
                id,
                MicrosoftIdentityConnectionService.CREDENTIAL_REFERENCE
        )).thenReturn(attached);
        when(connections.activate(id)).thenReturn(active);

        var service = new MicrosoftIdentityConnectionService(
                settings, tokens, probe, connections
        );

        var result = service.connect("Senac", "tenant-01");

        assertThat(result.getStatus()).isEqualTo(IntegrationConnectionStatus.ACTIVE);
        verify(probe).verifyEducationAccess("test-token");

        var order = inOrder(tokens, probe, connections);
        order.verify(tokens).acquire("tenant-01");
        order.verify(probe).verifyEducationAccess("test-token");
        order.verify(connections).create(
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-01"
        );
    }
}
