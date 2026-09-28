package br.com.arenadev.content.ingestion;

/** Source boundary for deterministic ingestion. Adapters normalize; they never create Journeys. */
public interface ContentSourceAdapter {
    boolean supports(ContentIngestionSource source);
    NormalizedDocument normalize(ContentIngestionService.PreviewRequest request);
}
