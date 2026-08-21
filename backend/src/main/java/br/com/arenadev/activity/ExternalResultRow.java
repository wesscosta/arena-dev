package br.com.arenadev.activity;

import br.com.arenadev.classroom.Student;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "external_result_rows")
public class ExternalResultRow {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private ExternalResultImport resultImport;

    @Column(name = "row_index", nullable = false)
    private int rowIndex;

    @Column(name = "participant_name", length = 180)
    private String participantName;

    @Column(name = "participant_registration", length = 120)
    private String participantRegistration;

    @Column(name = "raw_score", precision = 12, scale = 4)
    private BigDecimal rawScore;

    @Column(name = "max_score", precision = 12, scale = 4)
    private BigDecimal maxScore;

    @Column(precision = 8, scale = 4)
    private BigDecimal percentage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_student_id")
    private Student matchedStudent;

    @Column(name = "xp_awarded", nullable = false)
    private int xpAwarded;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(length = 300)
    private String note;

    @Column(name = "raw_payload")
    private String rawPayload;

    protected ExternalResultRow() {}

    public ExternalResultRow(
            int rowIndex,
            String participantName,
            String participantRegistration,
            BigDecimal rawScore,
            BigDecimal maxScore,
            BigDecimal percentage,
            Student matchedStudent,
            int xpAwarded,
            String status,
            String note,
            String rawPayload
    ) {
        this.rowIndex = rowIndex;
        this.participantName = participantName;
        this.participantRegistration = participantRegistration;
        this.rawScore = rawScore;
        this.maxScore = maxScore;
        this.percentage = percentage;
        this.matchedStudent = matchedStudent;
        this.xpAwarded = xpAwarded;
        this.status = status;
        this.note = note;
        this.rawPayload = rawPayload;
    }

    void attachTo(ExternalResultImport resultImport) { this.resultImport = resultImport; }

    public UUID getId() { return id; }
    public int getRowIndex() { return rowIndex; }
    public String getParticipantName() { return participantName; }
    public String getParticipantRegistration() { return participantRegistration; }
    public BigDecimal getRawScore() { return rawScore; }
    public BigDecimal getMaxScore() { return maxScore; }
    public BigDecimal getPercentage() { return percentage; }
    public Student getMatchedStudent() { return matchedStudent; }
    public int getXpAwarded() { return xpAwarded; }
    public String getStatus() { return status; }
    public String getNote() { return note; }
    public String getRawPayload() { return rawPayload; }
}
