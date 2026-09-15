
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_provider_links", uniqueConstraints = {
        @UniqueConstraint(name = "uk_activity_provider", columnNames = {"activity_id", "provider"}),
        @UniqueConstraint(name = "uk_provider_assignment", columnNames = {"provider", "external_assignment_id"})
})
public class ActivityProviderLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "activity_id", nullable = false) private Activity activity;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private LearningPlatformProvider provider;
    @Column(name = "external_class_id", length = 255) private String externalClassId;
    @Column(name = "external_assignment_id", nullable = false, length = 255) private String externalAssignmentId;
    @Column(name = "external_web_url", columnDefinition = "text") private String externalWebUrl;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    @Version @Column(nullable = false) private long version;

    protected ActivityProviderLink() {}
    public ActivityProviderLink(Activity activity, LearningPlatformProvider provider, String externalClassId, String externalAssignmentId, String externalWebUrl) {
        this.activity = activity; this.provider = provider; update(externalClassId, externalAssignmentId, externalWebUrl);
    }
    public void update(String externalClassId, String externalAssignmentId, String externalWebUrl) {
        this.externalClassId = clean(externalClassId);
        this.externalAssignmentId = required(externalAssignmentId, "externalAssignmentId");
        this.externalWebUrl = clean(externalWebUrl);
        this.updatedAt = Instant.now();
    }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String required(String value, String field) { String v = clean(value); if (v == null) throw new IllegalArgumentException(field + " é obrigatório."); return v; }
    public UUID getId() { return id; }
    public Activity getActivity() { return activity; }
    public LearningPlatformProvider getProvider() { return provider; }
    public String getExternalClassId() { return externalClassId; }
    public String getExternalAssignmentId() { return externalAssignmentId; }
    public String getExternalWebUrl() { return externalWebUrl; }
}
