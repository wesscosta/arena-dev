package br.com.arenadev.content.ingestion;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class MarkdownSourceAdapter implements ContentSourceAdapter {
    @Override
    public boolean supports(ContentIngestionSource source) { return source == ContentIngestionSource.MARKDOWN; }

    @Override
    public NormalizedDocument normalize(ContentIngestionService.PreviewRequest request) {
        String markdown = requireContent(request.content());
        List<NormalizedDocument.Block> blocks = new ArrayList<>();
        String documentTitle = null;
        boolean fenced = false;
        StringBuilder content = new StringBuilder();
        for (String raw : markdown.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1)) {
            String line = raw.stripTrailing();
            String trimmed = line.stripLeading();
            if (trimmed.startsWith("```")) {
                fenced = !fenced;
                content.append(line).append('\n');
                continue;
            }
            int level = fenced ? 0 : headingLevel(trimmed);
            if (level > 0) {
                flush(content, blocks);
                String text = trimmed.substring(level + 1).trim();
                if (level == 1 && documentTitle == null) documentTitle = text;
                else blocks.add(new NormalizedDocument.Heading(level, text));
            } else content.append(line).append('\n');
        }
        flush(content, blocks);
        return new NormalizedDocument(
                clean(request.title()) != null ? clean(request.title()) : documentTitle,
                blocks,
                new NormalizedDocument.Provenance(ContentIngestionSource.MARKDOWN, clean(request.sourceLabel()), clean(request.sourceUrl()), null, "MARKDOWN"),
                Map.of("mappingProfile", "MARKDOWN_H2_H3")
        );
    }

    private static int headingLevel(String line) {
        int count = 0;
        while (count < line.length() && count < 6 && line.charAt(count) == '#') count++;
        return count > 0 && count < line.length() && line.charAt(count) == ' ' ? count : 0;
    }
    private static void flush(StringBuilder value, List<NormalizedDocument.Block> blocks) {
        String text = value.toString().trim();
        if (!text.isEmpty()) blocks.add(new NormalizedDocument.Content(text));
        value.setLength(0);
    }
    private static String requireContent(String value) {
        String content = clean(value);
        if (content == null) throw new IllegalArgumentException("Forneça o conteúdo a ser analisado.");
        ContentIngestionLimits.requireWithinAnalysisLimit(content);
        return content;
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
