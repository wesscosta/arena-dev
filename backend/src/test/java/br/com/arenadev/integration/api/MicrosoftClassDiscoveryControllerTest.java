package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftClassDiscoveryService;
import br.com.arenadev.integration.provider.microsoft.MicrosoftEducationClass;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftClassDiscoveryControllerTest {
    @Test
    void returnsDiscoveryCountAndRemoteClasses() {
        var service=mock(MicrosoftClassDiscoveryService.class);
        var id=UUID.randomUUID();
        when(service.discover(id)).thenReturn(new MicrosoftClassDiscoveryService.DiscoveryResult(
                id,"tenant-01",List.of(
                        new MicrosoftEducationClass("class-1","TDS 2026","TDS-2026",null,null,null,null),
                        new MicrosoftEducationClass("class-2","Informática Básica","INF-2026",null,null,null,null)
                )
        ));
        var response=new MicrosoftClassDiscoveryController(service).discoverClasses(id);
        assertThat(response.connectionId()).isEqualTo(id);
        assertThat(response.tenantId()).isEqualTo("tenant-01");
        assertThat(response.count()).isEqualTo(2);
        assertThat(response.classes()).extracting(MicrosoftEducationClass::id).containsExactly("class-1","class-2");
    }
}
