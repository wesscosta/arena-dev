package br.com.arenadev.activity;

import br.com.arenadev.classroom.Classroom;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "external_result_imports")
public class ExternalResultImport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(length = 120)
    private String platform;

    @Column(name = "source_name", length = 255)
    private String sourceName;

    @Column(nullable = false, length = 64)
    private String fingerprint;

    @Column(name = "scoring_mode", nullable = false, length = 30)
    private String scoringMode = "PROPORTIONAL";

    @Column(name = "fallback_max_score", precision = 12, scale = 4)
    private BigDecimal fallbackMaxScore;

    @Column(name = "row_count", nullable = false)
    private int rowCount;

    @Column(name = "matched_count", nullable = false)
    private int matchedCount;

    @Column(name = "imported_count", nullable = false)
    private int importedCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "resultImport", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("rowIndex ASC")
    private List<ExternalResultRow> rows = new ArrayList<>();

    protected ExternalResultImport() {}

    public ExternalResultImport(
            Classroom classroom,
            Activity activity,
            String platform,
            String sourceName,
            String fingerprint,
            BigDecimal fallbackMaxScore,
            int rowCount,
            int matchedCount,
            int importedCount
    ) {
        this.classroom = classroom;
        this.activity = activity;
        this.platform = platform;
        this.sourceName = sourceName;
        this.fingerprint = fingerprint;
        this.fallbackMaxScore = fallbackMaxScore;
        this.rowCount = rowCount;
        this.matchedCount = matchedCount;
        this.importedCount = importedCount;
    }

    public void addRow(ExternalResultRow row) {
        row.attachTo(this);
        rows.add(row);
    }

    public UUID getId() { return id; }
    public Classroom getClassroom() { return classroom; }
    public Activity getActivity() { return activity; }
    public String getPlatform() { return platform; }
    public String getSourceName() { return sourceName; }
    public String getFingerprint() { return fingerprint; }
    public String getScoringMode() { return scoringMode; }
    public BigDecimal getFallbackMaxScore() { return fallbackMaxScore; }
    public int getRowCount() { return rowCount; }
    public int getMatchedCount() { return matchedCount; }
    public int getImportedCount() { return importedCount; }
    public Instant getCreatedAt() { return createdAt; }
    public List<ExternalResultRow> getRows() { return rows; }
}
