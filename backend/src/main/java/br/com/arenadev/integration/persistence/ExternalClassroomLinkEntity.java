package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "external_classroom_links")
public class ExternalClassroomLinkEntity {
    @Id private UUID id;
    @Column(name = "connection_id", nullable = false) private UUID connectionId;
    @Column(name = "classroom_id", nullable = false) private UUID classroomId;
    @Column(name = "external_classroom_id", nullable = false, length = 255) private String externalClassroomId;
    @Column(name = "external_web_url", columnDefinition = "text") private String externalWebUrl;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected ExternalClassroomLinkEntity() {}

    public ExternalClassroomLinkEntity(UUID id, UUID connectionId, UUID classroomId, String externalClassroomId, String externalWebUrl, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.connectionId = Objects.requireNonNull(connectionId);
        this.classroomId = Objects.requireNonNull(classroomId);
        this.externalClassroomId = required(externalClassroomId);
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
    public UUID getClassroomId() { return classroomId; }
    public String getExternalClassroomId() { return externalClassroomId; }
    public String getExternalWebUrl() { return externalWebUrl; }
}
