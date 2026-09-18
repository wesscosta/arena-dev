package br.com.arenadev.integration.api;

import br.com.arenadev.integration.application.*;
import br.com.arenadev.integration.domain.*;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class IntegrationAdminControllerTest {

    @Test
    void connectionResponsesNeverExposeCredentialReference() {
        var connections = mock(IntegrationConnectionService.class);
        var links = mock(ExternalLinkService.class);
        var sync = mock(SyncExecutionService.class);
        var checkpoints = mock(SyncCheckpointService.class);

        var entity = new IntegrationConnectionEntity(
                UUID.randomUUID(),
                LearningPlatformProvider.MICROSOFT_TEAMS,
                "Senac",
                "tenant-1",
                "vault://secret/token",
                IntegrationConnectionStatus.ACTIVE,
                Instant.parse("2026-09-18T15:00:00Z")
        );
        when(connections.list()).thenReturn(List.of(entity));

        var controller = new IntegrationAdminController(connections, links, sync, checkpoints);
        var response = controller.listConnections();

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().displayName()).isEqualTo("Senac");
        assertThat(response.getFirst().toString()).doesNotContain("vault://secret/token");
    }

    @Test
    void createConnectionReturnsCreatedAndLocation() {
        var connections = mock(IntegrationConnectionService.class);
        var links = mock(ExternalLinkService.class);
        var sync = mock(SyncExecutionService.class);
        var checkpoints = mock(SyncCheckpointService.class);

        var entity = new IntegrationConnectionEntity(
                UUID.randomUUID(),
                LearningPlatformProvider.GOOGLE_CLASSROOM,
                "Google Escola",
                "tenant-2",
                null,
                IntegrationConnectionStatus.DRAFT,
                Instant.parse("2026-09-18T15:00:00Z")
        );
        when(connections.create(
                LearningPlatformProvider.GOOGLE_CLASSROOM,
                "Google Escola",
                "tenant-2"
        )).thenReturn(entity);

        var controller = new IntegrationAdminController(connections, links, sync, checkpoints);
        var response = controller.createConnection(
                new IntegrationAdminController.CreateConnectionRequest(
                        LearningPlatformProvider.GOOGLE_CLASSROOM,
                        "Google Escola",
                        "tenant-2"
                )
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation().toString())
                .endsWith("/api/integrations/connections/" + entity.getId());
        assertThat(response.getBody().status()).isEqualTo(IntegrationConnectionStatus.DRAFT);
    }
}
