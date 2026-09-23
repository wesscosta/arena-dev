package br.com.arenadev.integration.provider.microsoft;

public record MicrosoftEducationUser(
        String id,
        String displayName,
        String givenName,
        String surname,
        String userPrincipalName,
        String primaryRole,
        String externalId
) {
    public MicrosoftEducationUser {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationUser sem id.");
        }
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("Microsoft educationUser sem displayName.");
        }
    }

    public boolean isStudent() {
        return "student".equalsIgnoreCase(primaryRole);
    }

    public boolean isTeacher() {
        return "teacher".equalsIgnoreCase(primaryRole);
    }
}
