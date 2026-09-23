package br.com.arenadev.integration.application;

import br.com.arenadev.integration.application.port.LearningPlatformAdapter;
import br.com.arenadev.integration.domain.IntegrationConnection;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class LearningPlatformAdapterRegistry {
    private final Map<LearningPlatformProvider, LearningPlatformAdapter> adapters;

    public LearningPlatformAdapterRegistry(List<LearningPlatformAdapter> adapters) {
        var indexed = new EnumMap<LearningPlatformProvider, LearningPlatformAdapter>(LearningPlatformProvider.class);

        for (var adapter : adapters) {
            var previous = indexed.putIfAbsent(adapter.provider(), adapter);
            if (previous != null) {
                throw new IllegalStateException(
                        "Mais de um adapter registrado para o provider: " + adapter.provider()
                );
            }
        }

        this.adapters = Map.copyOf(indexed);
    }

    public LearningPlatformAdapter required(LearningPlatformProvider provider) {
        var adapter = adapters.get(provider);
        if (adapter == null) throw new IntegrationAdapterNotFoundException(provider);
        return adapter;
    }

    public LearningPlatformAdapter required(IntegrationConnection connection) {
        return required(connection.provider());
    }

    public boolean hasAdapter(LearningPlatformProvider provider) {
        return adapters.containsKey(provider);
    }
}
