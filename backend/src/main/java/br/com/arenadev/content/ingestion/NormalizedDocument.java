package br.com.arenadev.content.ingestion;

import java.util.List;
import java.util.Map;

/**
 * Source-neutral snapshot produced by ingestion adapters before Journey mapping.
 * It preserves declared document structure and provenance without leaking source APIs
 * into the Journey domain.
 */
public record NormalizedDocument(
        String title,
        List<Block> blocks,
        Provenance provenance,
        Map<String, String> metadata
) {
    public NormalizedDocument {
        blocks = blocks == null ? List.of() : List.copyOf(blocks);
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public sealed interface Block permits Heading, Content {
        String text();
    }

    public record Heading(int level, String text) implements Block {
        public Heading {
            if (level < 1 || level > 6) throw new IllegalArgumentException("Heading level must be between 1 and 6.");
        }
    }

    public record Content(String text) implements Block {}

    public record Provenance(
            ContentIngestionSource source,
            String sourceLabel,
            String sourceUrl,
            String sourceIdentifier,
            String format
    ) {}
}
