package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_submission_links")
public class ExternalSubmissionLinkEntity {
    @Id private UUID id;
    @Column(name = "connection_id", nullable = false) private UUID connectionId;
    @Column(name = "external_activity_link_id", nullable = false) private UUID externalActivityLinkId;
    @Column(name = "external_student_link_id") private UUID externalStudentLinkId;
    @Column(name = "submission_id", nullable = false) private UUID submissionId;
    @Column(name = "external_submission_id", nullable = false, length = 255) private String externalSubmissionId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version @Column(nullable = false) private long version;

    protected ExternalSubmissionLinkEntity() {}
    public UUID getId() { return id; }
}
