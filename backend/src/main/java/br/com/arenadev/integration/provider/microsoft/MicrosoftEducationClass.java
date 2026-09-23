package br.com.arenadev.integration.provider.microsoft;

public record MicrosoftEducationClass(
        String id,
        String displayName,
        String classCode,
        String externalId,
        String externalName,
        String description,
        String grade
) {
    public MicrosoftEducationClass {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Microsoft educationClass sem id.");
        if (displayName == null || displayName.isBlank()) throw new IllegalArgumentException("Microsoft educationClass sem displayName.");
    }
}
