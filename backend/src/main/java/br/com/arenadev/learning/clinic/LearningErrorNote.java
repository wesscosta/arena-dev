package br.com.arenadev.learning.clinic;

import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "learning_error_clinic_notes")
public class LearningErrorNote {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id", nullable = false)
    private InteractionRun run;
    @Column(name = "option_key", nullable = false, length = 100)
    private String optionKey;
    @Column(name = "command_id", nullable = false)
    private UUID commandId;
    @Column(name = "teacher_note", nullable = false, length = 1200)
    private String teacherNote;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);

    protected LearningErrorNote() {}

    public LearningErrorNote(ClassSession session, InteractionRun run, String optionKey,
                             UUID commandId, String teacherNote) {
        this.session = Objects.requireNonNull(session);
        this.run = Objects.requireNonNull(run);
        if (!session.getId().equals(run.getSession().getId()))
            throw new IllegalArgumentException("Execução não pertence à sessão.");
        this.optionKey = Objects.requireNonNull(optionKey);
        this.commandId = Objects.requireNonNull(commandId);
        if (teacherNote == null || teacherNote.isBlank() || teacherNote.trim().length() > 1200)
            throw new IllegalArgumentException("Descreva a orientação em até 1200 caracteres.");
        this.teacherNote = teacherNote.trim();
    }
    public UUID getId() { return id; }
    public UUID getRunId() { return run.getId(); }
    public String getOptionKey() { return optionKey; }
    public UUID getCommandId() { return commandId; }
    public String getTeacherNote() { return teacherNote; }
    public Instant getCreatedAt() { return createdAt; }
}
