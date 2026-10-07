package br.com.arenadev.learning;

public record ContentRef(
        String sourceType,
        String sourceId,
        Integer sourceVersion,
        String anchor
) {
    public ContentRef {
        sourceType = requireNonBlank(sourceType, "O tipo da fonte de conteúdo é obrigatório.");
        sourceId = requireNonBlank(sourceId, "O identificador da fonte de conteúdo é obrigatório.");
        anchor = normalizeOptional(anchor);
        if (sourceVersion != null && sourceVersion < 1) {
            throw new IllegalArgumentException("A versão da fonte de conteúdo deve ser positiva.");
        }
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
