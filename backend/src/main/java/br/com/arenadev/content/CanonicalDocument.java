package br.com.arenadev.content;

import java.util.List;

/**
 * Source-neutral semantic representation used while normalizing Library content.
 *
 * <p>This is deliberately not a persistence entity. LearningResource remains the durable
 * source of truth after materialization; sections are a deterministic derived projection.</p>
 */
public record CanonicalDocument(
        String title,
        String body,
        LearningResourceFormat format,
        String subject,
        List<String> tags,
        String language,
        String contentSha256,
        String parserVersion,
        List<Section> sections
) {
    public CanonicalDocument {
        tags = tags == null ? List.of() : List.copyOf(tags);
        sections = sections == null ? List.of() : List.copyOf(sections);
    }

    public record Section(
            int level,
            String title,
            String anchor,
            List<String> sectionPath,
            List<Section> children
    ) {
        public Section {
            sectionPath = sectionPath == null ? List.of() : List.copyOf(sectionPath);
            children = children == null ? List.of() : List.copyOf(children);
        }
    }
}
