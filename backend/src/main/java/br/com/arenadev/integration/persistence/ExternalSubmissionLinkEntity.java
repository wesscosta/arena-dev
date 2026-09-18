package br.com.arenadev.integration.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
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

    public ExternalSubmissionLinkEntity(UUID id, UUID connectionId, UUID externalActivityLinkId, UUID externalStudentLinkId, UUID submissionId, String externalSubmissionId, Instant now) {
        this.id = Objects.requireNonNull(id);
        this.connectionId = Objects.requireNonNull(connectionId);
        this.externalActivityLinkId = Objects.requireNonNull(externalActivityLinkId);
        this.externalStudentLinkId = externalStudentLinkId;
        this.submissionId = Objects.requireNonNull(submissionId);
        this.externalSubmissionId = required(externalSubmissionId);
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
    public UUID getExternalActivityLinkId() { return externalActivityLinkId; }
    public UUID getExternalStudentLinkId() { return externalStudentLinkId; }
    public UUID getSubmissionId() { return submissionId; }
    public String getExternalSubmissionId() { return externalSubmissionId; }
}
