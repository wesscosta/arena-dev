package br.com.arenadev.content;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Deterministic content canonicalizer for the Library.
 *
 * <p>Structured input is parsed without AI. The same normalized input produces the same
 * hash and outline, which makes derived projections (Structure/Map) safe to rebuild.</p>
 */
@Component
public class ContentCanonicalizer {
    public static final String PARSER_VERSION = "arena-outline-v1";

    public CanonicalDocument canonicalize(
            String title,
            String body,
            LearningResourceFormat format,
            String sourceUrl,
            String subject,
            List<String> tags,
            String language
    ) {
        LearningResourceFormat safeFormat = format == null ? LearningResourceFormat.MARKDOWN : format;
        String canonicalBody = canonicalBody(body);
        List<String> normalizedTags = normalizeTags(tags);
        String normalizedSubject = clean(subject);
        String normalizedLanguage = clean(language);
        String hashMaterial = safeFormat == LearningResourceFormat.LINK
                ? "LINK\n" + Objects.toString(clean(sourceUrl), "")
                : safeFormat.name() + "\n" + Objects.toString(canonicalBody, "");
        List<CanonicalDocument.Section> sections = safeFormat == LearningResourceFormat.MARKDOWN
                ? parseMarkdownOutline(canonicalBody)
                : List.of();

        return new CanonicalDocument(
                clean(title),
                canonicalBody,
                safeFormat,
                normalizedSubject,
                normalizedTags,
                normalizedLanguage,
                sha256(hashMaterial),
                PARSER_VERSION,
                sections
        );
    }

    public List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) return List.of();
        Set<String> seen = new LinkedHashSet<>();
        Map<String, String> values = new LinkedHashMap<>();
        for (String raw : tags) {
            String value = clean(raw);
            if (value == null) continue;
            if (value.length() > 80) value = value.substring(0, 80).trim();
            String key = value.toLowerCase(Locale.ROOT);
            if (seen.add(key)) values.put(key, value);
            if (values.size() >= 20) break;
        }
        return List.copyOf(values.values());
    }

    private List<CanonicalDocument.Section> parseMarkdownOutline(String markdown) {
        if (markdown == null || markdown.isBlank()) return List.of();

        List<Node> roots = new ArrayList<>();
        ArrayDeque<Node> stack = new ArrayDeque<>();
        Map<String, Integer> anchorCounts = new LinkedHashMap<>();
        boolean fenced = false;
        String fenceMarker = null;

        for (String raw : markdown.split("\n", -1)) {
            String trimmed = raw.stripLeading();
            if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
                String marker = trimmed.substring(0, 3);
                if (!fenced) {
                    fenced = true;
                    fenceMarker = marker;
                } else if (Objects.equals(fenceMarker, marker)) {
                    fenced = false;
                    fenceMarker = null;
                }
                continue;
            }
            if (fenced) continue;

            int level = headingLevel(trimmed);
            if (level == 0) continue;
            String heading = trimmed.substring(level).trim();
            heading = heading.replaceFirst("\\s+#+\\s*$", "").trim();
            if (heading.isBlank()) continue;

            while (!stack.isEmpty() && stack.peekLast().level >= level) {
                stack.removeLast();
            }

            List<String> path = new ArrayList<>();
            for (Node parent : stack) path.add(parent.title);
            path.add(heading);

            String baseAnchor = slug(heading);
            int occurrence = anchorCounts.merge(baseAnchor, 1, Integer::sum);
            String anchor = occurrence == 1 ? baseAnchor : baseAnchor + "-" + occurrence;

            Node node = new Node(level, heading, anchor, List.copyOf(path));
            if (stack.isEmpty()) roots.add(node);
            else stack.peekLast().children.add(node);
            stack.addLast(node);
        }

        return roots.stream().map(Node::freeze).toList();
    }

    private static int headingLevel(String value) {
        int count = 0;
        while (count < value.length() && count < 6 && value.charAt(count) == '#') count++;
        return count > 0 && count < value.length() && Character.isWhitespace(value.charAt(count))
                ? count
                : 0;
    }

    private static String canonicalBody(String value) {
        if (value == null) return null;
        String normalized = value.replace("\r\n", "\n").replace('\r', '\n').strip();
        return normalized.isBlank() ? null : normalized;
    }

    private static String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized.isBlank() ? "secao" : normalized;
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("Não foi possível calcular o hash do conteúdo.", error);
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static final class Node {
        private final int level;
        private final String title;
        private final String anchor;
        private final List<String> path;
        private final List<Node> children = new ArrayList<>();

        private Node(int level, String title, String anchor, List<String> path) {
            this.level = level;
            this.title = title;
            this.anchor = anchor;
            this.path = path;
        }

        private CanonicalDocument.Section freeze() {
            return new CanonicalDocument.Section(
                    level,
                    title,
                    anchor,
                    path,
                    children.stream().map(Node::freeze).toList()
            );
        }
    }
}
