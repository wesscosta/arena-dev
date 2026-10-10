package br.com.arenadev.learning.presentation;

import br.com.arenadev.content.LearningResourceFormat;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fail-closed checks for active markup in prose without rejecting pedagogical
 * HTML/JS examples inside Markdown code fences or inline code spans.
 *
 * The public reader remains the safety boundary (skipHtml, no executable
 * HTML, images or external clickable links). This check is defense in depth.
 */
final class MaterialPresentationSafetyPolicy {
    private static final Pattern UNSAFE_PROSE = Pattern.compile(
            "(?is)<\\s*(script|iframe|object|embed|svg|img|video|audio)\\b"
                    + "|javascript\\s*:|data\\s*:|!\\s*\\[[^]\\r\\n]*]\\s*\\(");
    private static final Pattern FENCE = Pattern.compile("^ {0,3}(`{3,}|~{3,})(.*)$");

    private MaterialPresentationSafetyPolicy() {}

    static boolean containsUnsafeContent(String body, LearningResourceFormat format) {
        // Plain text is rendered through React's escaped text node in a pre element.
        if (format == LearningResourceFormat.PLAIN_TEXT) return false;
        if (body == null) return false;

        char fenceChar = '\0';
        int fenceLength = 0;
        for (String line : body.split("\\R", -1)) {
            Matcher marker = FENCE.matcher(line);
            if (fenceLength > 0) {
                if (marker.matches() && marker.group(1).charAt(0) == fenceChar
                        && marker.group(1).length() >= fenceLength
                        && marker.group(2).isBlank()) {
                    fenceChar = '\0';
                    fenceLength = 0;
                }
                continue;
            }
            if (marker.matches()) {
                // A closing fence is not needed for a code block at EOF.
                fenceChar = marker.group(1).charAt(0);
                fenceLength = marker.group(1).length();
                continue;
            }
            // Markdown treats four leading spaces or a tab as a code block.
            if (line.startsWith("    ") || line.startsWith("\t")) continue;
            if (UNSAFE_PROSE.matcher(withoutInlineCodeSpans(line)).find()) return true;
        }
        return false;
    }

    private static String withoutInlineCodeSpans(String line) {
        StringBuilder visible = new StringBuilder(line.length());
        int index = 0;
        while (index < line.length()) {
            if (line.charAt(index) != '`') {
                visible.append(line.charAt(index++));
                continue;
            }
            int start = index;
            while (index < line.length() && line.charAt(index) == '`') index++;
            int size = index - start;
            int close = findMatchingBackticks(line, index, size);
            if (close < 0) {
                visible.append(line, start, index);
                continue;
            }
            // Never join prose on either side of the code span.
            visible.append(' ');
            index = close + size;
        }
        return visible.toString();
    }

    private static int findMatchingBackticks(String line, int from, int length) {
        int at = from;
        while (at < line.length()) {
            at = line.indexOf('`', at);
            if (at < 0) return -1;
            int end = at;
            while (end < line.length() && line.charAt(end) == '`') end++;
            if (end - at == length) return at;
            at = end;
        }
        return -1;
    }
}
