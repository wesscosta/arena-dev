package br.com.arenadev.wordcloud;

import java.text.Normalizer;
import java.util.Locale;

public final class WordCloudTextNormalizer {
    private WordCloudTextNormalizer() {
    }

    public static String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\s-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
