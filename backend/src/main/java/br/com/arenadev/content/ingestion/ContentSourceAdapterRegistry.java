package br.com.arenadev.content.ingestion;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ContentSourceAdapterRegistry {
    private final List<ContentSourceAdapter> adapters;

    public ContentSourceAdapterRegistry(List<ContentSourceAdapter> adapters) { this.adapters = List.copyOf(adapters); }

    public NormalizedDocument normalize(ContentIngestionService.PreviewRequest request) {
        return adapters.stream()
                .filter(adapter -> adapter.supports(request.source()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Fonte ainda não possui adapter de normalização: " + request.source()))
                .normalize(request);
    }
}
