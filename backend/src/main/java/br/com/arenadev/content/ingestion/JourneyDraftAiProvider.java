package br.com.arenadev.content.ingestion;

public interface JourneyDraftAiProvider {
    boolean isConfigured();
    ContentIngestionService.DraftView generate(ContentIngestionService.PreviewRequest request);
}
