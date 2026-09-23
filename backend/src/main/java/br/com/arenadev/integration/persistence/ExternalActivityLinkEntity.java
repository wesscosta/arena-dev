package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "external_activity_links")
public class ExternalActivityLinkEntity {
    @Id private UUID id;
    @Column(name = "connection_id", nullable = false) private UUID connectionId;
    @Column(name = "external_classroom_link_id", nullable = false) private UUID externalClassroomLinkId;
    @Column(name = "activity_id", nullable = false) private UUID activityId;
    @Column(name = "external_activity_id", nullable = false, length = 255) private String externalActivityId;
    @Column(name = "external_web_url", columnDefinition = "text") private String externalWebUrl;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected ExternalActivityLinkEntity() {}

    public ExternalActivityLinkEntity(UUID id, UUID connectionId, UUID externalClassroomLinkId, UUID activityId, String externalActivityId, String externalWebUrl, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.connectionId = Objects.requireNonNull(connectionId);
        this.externalClassroomLinkId = Objects.requireNonNull(externalClassroomLinkId);
        this.activityId = Objects.requireNonNull(activityId);
        this.externalActivityId = required(externalActivityId);
        this.externalWebUrl = clean(externalWebUrl);
        this.createdAt = Objects.requireNonNull(now);
        this.updatedAt = now;
    }

    private static String clean(String v) { return v == null || v.isBlank() ? null : v.trim(); }
    private static String required(String v) {
        String clean = clean(v);
        if (clean == null) throw new IllegalArgumentException("Valor obrigatório.");
        return clean;
    }

    public UUID getId() { return id; }
    public UUID getConnectionId() { return connectionId; }
    public UUID getExternalClassroomLinkId() { return externalClassroomLinkId; }
    public UUID getActivityId() { return activityId; }
    public String getExternalActivityId() { return externalActivityId; }
    public String getExternalWebUrl() { return externalWebUrl; }
}
