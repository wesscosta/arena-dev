
package br.com.arenadev.submission;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submission_provider_links", uniqueConstraints = {
        @UniqueConstraint(name = "uk_submission_provider", columnNames = {"submission_id", "provider"}),
        @UniqueConstraint(name = "uk_provider_submission", columnNames = {"provider", "external_submission_id"})
})
public class SubmissionProviderLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "submission_id", nullable = false) private ActivitySubmission submission;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private LearningPlatformProvider provider;
    @Column(name = "external_submission_id", nullable = false, length = 255) private String externalSubmissionId;
    @Column(name = "external_user_id", length = 255) private String externalUserId;
    @Enumerated(EnumType.STRING) @Column(name = "sync_state", nullable = false, length = 24) private ProviderSyncState syncState = ProviderSyncState.LINKED;
    @Column(name = "imported_at") private Instant importedAt;
    @Column(name = "last_synced_at") private Instant lastSyncedAt;
    @Column(name = "last_error", columnDefinition = "text") private String lastError;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    @Version @Column(nullable = false) private long version;

    protected SubmissionProviderLink() {}
    public SubmissionProviderLink(ActivitySubmission submission, LearningPlatformProvider provider, String externalSubmissionId, String externalUserId) {
        this.submission = submission; this.provider = provider; this.externalSubmissionId = required(externalSubmissionId); this.externalUserId = clean(externalUserId);
    }
    public void markImported(Instant when) { syncState = ProviderSyncState.IMPORTED; importedAt = when; updatedAt = when; lastError = null; }
    public void markSynced(Instant when) { syncState = ProviderSyncState.SYNCED; lastSyncedAt = when; updatedAt = when; lastError = null; }
    public void markError(String message) { syncState = ProviderSyncState.ERROR; lastError = clean(message); updatedAt = Instant.now(); }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String required(String value) { String v = clean(value); if (v == null) throw new IllegalArgumentException("externalSubmissionId é obrigatório."); return v; }
    public UUID getId() { return id; }
    public ActivitySubmission getSubmission() { return submission; }
    public LearningPlatformProvider getProvider() { return provider; }
    public String getExternalSubmissionId() { return externalSubmissionId; }
    public String getExternalUserId() { return externalUserId; }
    public ProviderSyncState getSyncState() { return syncState; }
}
