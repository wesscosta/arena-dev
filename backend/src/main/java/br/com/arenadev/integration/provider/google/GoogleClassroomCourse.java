package br.com.arenadev.integration.provider.google;
public record GoogleClassroomCourse(String id, String name, String section, String descriptionHeading, String room, String courseState, String alternateLink, String ownerId) {
    public GoogleClassroomCourse {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Google Classroom course sem id.");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Google Classroom course sem nome.");
    }
}
