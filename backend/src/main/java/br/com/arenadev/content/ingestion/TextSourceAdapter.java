package br.com.arenadev.content.ingestion;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class TextSourceAdapter implements ContentSourceAdapter {
    @Override
    public boolean supports(ContentIngestionSource source) {
        return source == ContentIngestionSource.TEXT || source == ContentIngestionSource.FILE;
    }

    @Override
    public NormalizedDocument normalize(ContentIngestionService.PreviewRequest request) {
        String content = requireContent(request.content());
        List<NormalizedDocument.Block> blocks = new ArrayList<>();
        String normalized = content.replace("\r\n", "\n").replace('\r', '\n').trim();
        for (String paragraph : normalized.split("\n\\s*\n")) {
            String text = paragraph.trim();
            if (text.isEmpty()) continue;
            String[] lines = text.split("\n");
            if (lines.length > 1 && looksLikeHeading(lines[0].trim())) {
                blocks.add(new NormalizedDocument.Heading(2, lines[0].trim()));
                String remainder = String.join("\n", java.util.Arrays.copyOfRange(lines, 1, lines.length)).trim();
                if (!remainder.isEmpty()) blocks.add(new NormalizedDocument.Content(remainder));
            } else if (looksLikeHeading(text)) {
                blocks.add(new NormalizedDocument.Heading(2, text));
            } else {
                blocks.add(new NormalizedDocument.Content(text));
            }
            if (blocks.size() >= 48) break;
        }
        return new NormalizedDocument(
                clean(request.title()), blocks,
                new NormalizedDocument.Provenance(request.source(), clean(request.sourceLabel()), clean(request.sourceUrl()), null, "TEXT"),
                Map.of()
        );
    }

    private static boolean looksLikeHeading(String value) {
        String text = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        if (text.isEmpty() || text.length() > 90 || text.contains("\n")) return false;
        if (text.matches("(?i)^(m[oó]dulo|cap[ií]tulo|unidade|aula|tema|etapa|se[cç][aã]o|parte)\\s+[A-ZÀ-Ú0-9IVXLC].*")) return true;
        if (text.matches("^\\d+(?:\\.\\d+){0,3}[).:-]?\\s+.{2,70}$")) return true;
        int letters = 0, upper = 0;
        for (char c : text.toCharArray()) if (Character.isLetter(c)) { letters++; if (Character.isUpperCase(c)) upper++; }
        return letters >= 4 && upper >= Math.ceil(letters * .82) && !text.endsWith(".");
    }

    private static String requireContent(String value) {
        String content = clean(value);
        if (content == null) throw new IllegalArgumentException("Forneça o conteúdo a ser analisado.");
        if (content.length() > 120_000) throw new IllegalArgumentException("O conteúdo excede o limite de 120 mil caracteres por análise.");
        return content;
    }

    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
