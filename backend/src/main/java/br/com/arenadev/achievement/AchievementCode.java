package br.com.arenadev.achievement;

public enum AchievementCode {
    FIRST_CONTENT_COMPLETED("Primeiro Passo", "Conclua seu primeiro conteúdo."),
    FIRST_MODULE_COMPLETED("Primeiro Capítulo", "Conclua seu primeiro capítulo."),
    FIRST_JOURNEY_COMPLETED("Primeira Jornada", "Conclua sua primeira Jornada.");

    private final String title;
    private final String description;

    AchievementCode(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public String title() { return title; }
    public String description() { return description; }
}
