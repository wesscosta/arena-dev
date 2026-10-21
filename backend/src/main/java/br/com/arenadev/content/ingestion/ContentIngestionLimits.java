package br.com.arenadev.content.ingestion;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * One size limit for every analysis and import path (pasted text, Markdown,
 * Notion, files). Analysis is linear and stays well under a second at the
 * limit; it exists to bound request size and the drafts a teacher reviews.
 */
public final class ContentIngestionLimits {
    public static final int MAX_ANALYSIS_CHARACTERS = 1_000_000;

    private ContentIngestionLimits() {}

    public static void requireWithinAnalysisLimit(String content) {
        if (content != null && content.length() > MAX_ANALYSIS_CHARACTERS) {
            throw new IllegalArgumentException(tooLongMessage(content.length()));
        }
    }

    static String tooLongMessage(long characters) {
        String size = NumberFormat.getIntegerInstance(Locale.forLanguageTag("pt-BR")).format(characters);
        return "O material tem " + size + " caracteres e o limite por análise é de 1 milhão. "
                + "Divida o material em partes e importe cada uma separadamente.";
    }
}
