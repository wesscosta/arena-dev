package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_student_links")
public class ExternalStudentLinkEntity {
    @Id private UUID id;
    @Column(name = "connection_id", nullable = false) private UUID connectionId;
    @Column(name = "external_classroom_link_id", nullable = false) private UUID externalClassroomLinkId;
    @Column(name = "enrollment_id", nullable = false) private UUID enrollmentId;
    @Column(name = "external_user_id", nullable = false, length = 255) private String externalUserId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected ExternalStudentLinkEntity() {}
    public UUID getId() { return id; }
}
