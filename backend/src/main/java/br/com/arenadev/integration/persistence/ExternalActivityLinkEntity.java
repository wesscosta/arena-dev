package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
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
    public UUID getId() { return id; }
}
