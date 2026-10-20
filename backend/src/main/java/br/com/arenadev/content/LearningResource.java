package br.com.arenadev.content;

import br.com.arenadev.classroom.Classroom;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "learning_resources")
public class LearningResource {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(columnDefinition = "text")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LearningResourceFormat format = LearningResourceFormat.MARKDOWN;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private LearningResourceSourceType sourceType = LearningResourceSourceType.MANUAL;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "source_label")
    private String sourceLabel;

    @Column(name = "source_reference", columnDefinition = "text")
    private String sourceReference;

    @Column(name = "source_snapshot_at")
    private Instant sourceSnapshotAt;

    @Column(name = "source_content_sha256", length = 64)
    private String sourceContentSha256;

    @Column(length = 160)
    private String subject;

    @Column(length = 20)
    private String language;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "learning_resource_tags", joinColumns = @JoinColumn(name = "resource_id"))
    @Column(name = "tag", nullable = false, length = 80)
    private Set<String> tags = new LinkedHashSet<>();

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "outline_json", columnDefinition = "text")
    private String outlineJson;

    @Column(name = "outline_parser_version", length = 40)
    private String outlineParserVersion;

    @Column(name = "library_visible", nullable = false)
    private boolean libraryVisible = false;

    @Column(name = "copy_protected", nullable = false)
    private boolean copyProtected = false;

    @Column(nullable = false)
    private int revision = 1;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LearningResource() {}

    public LearningResource(Classroom classroom, String title) {
        this.classroom = classroom;
        this.title = title;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    /**
     * Updates resource content and editorial fields that are directly tied to the content representation.
     * The monotonic revision advances only when the materialized content changes; metadata-only changes
     * such as subject/tags/language are deliberately revision-neutral.
     */
    public boolean update(
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel
    ) {
        LearningResourceFormat nextFormat = format == null ? LearningResourceFormat.MARKDOWN : format;
        LearningResourceSourceType nextSourceType = sourceType == null ? LearningResourceSourceType.MANUAL : sourceType;
        // Revision tracks exactly the fields that JourneyStage materializes into its snapshot.
        // Editorial discovery metadata (subject/tags/language) remains revision-neutral.
        boolean contentChanged = this.id != null && (
                !Objects.equals(this.body, body)
                        || this.format != nextFormat
                        || !Objects.equals(this.sourceUrl, sourceUrl)
                        || !Objects.equals(this.sourceLabel, sourceLabel)
        );

        this.title = title;
        this.summary = summary;
        this.body = body;
        this.format = nextFormat;
        this.sourceType = nextSourceType;
        this.sourceUrl = sourceUrl;
        this.sourceLabel = sourceLabel;
        if (contentChanged) this.revision++;
        this.updatedAt = Instant.now();
        return contentChanged;
    }

    public void updateSemanticMetadata(String subject, List<String> tags, String language) {
        this.subject = normalizeOptional(subject);
        this.language = normalizeOptional(language);
        this.tags.clear();
        if (tags != null) this.tags.addAll(tags);
        this.updatedAt = Instant.now();
    }

    public void recordDerivedStructure(String contentSha256, String outlineJson, String parserVersion) {
        this.contentSha256 = normalizeOptional(contentSha256);
        this.outlineJson = normalizeOptional(outlineJson);
        this.outlineParserVersion = normalizeOptional(parserVersion);
        this.updatedAt = Instant.now();
    }

    public void publishToLibrary() {
        this.libraryVisible = true;
        this.archivedAt = null;
        this.updatedAt = Instant.now();
    }

    public void archiveFromLibrary() {
        this.libraryVisible = false;
        this.archivedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void recordProvenance(String sourceReference, Instant sourceSnapshotAt, String sourceContentSha256) {
        this.sourceReference = normalizeOptional(sourceReference);
        this.sourceSnapshotAt = sourceSnapshotAt;
        this.sourceContentSha256 = normalizeOptional(sourceContentSha256);
        this.updatedAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getBody() { return body; }
    public LearningResourceFormat getFormat() { return format; }
    public LearningResourceSourceType getSourceType() { return sourceType; }
    public String getSourceUrl() { return sourceUrl; }
    public String getSourceLabel() { return sourceLabel; }
    public String getSourceReference() { return sourceReference; }
    public Instant getSourceSnapshotAt() { return sourceSnapshotAt; }
    public String getSourceContentSha256() { return sourceContentSha256; }
    public String getSubject() { return subject; }
    public String getLanguage() { return language; }
    public List<String> getTags() { return List.copyOf(tags); }
    public String getContentSha256() { return contentSha256; }
    public String getOutlineJson() { return outlineJson; }
    public String getOutlineParserVersion() { return outlineParserVersion; }
    public boolean isLibraryVisible() { return libraryVisible; }

    /** Students cannot copy this material in the reader, in any Journey that uses it. */
    public void changeCopyProtection(boolean copyProtected) { this.copyProtected = copyProtected; }

    public boolean isCopyProtected() { return copyProtected; }
    public int getRevision() { return revision; }
    public Instant getArchivedAt() { return archivedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
