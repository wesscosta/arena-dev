package br.com.arenadev.learning.loop;

import br.com.arenadev.interaction.InteractionRun;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "learning_intervention_cycles")
public class LearningCycle {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_target_id", nullable = false)
    private LearningTarget target;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "baseline_run_id", nullable = false, unique = true)
    private InteractionRun baseline;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followup_run_id", unique = true)
    private InteractionRun followup;
    @Column(name = "intervention_note", length = 2000)
    private String interventionNote;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LearningCycleStatus status = LearningCycleStatus.DIAGNOSED;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LearningCycle() {}

    public LearningCycle(ClassSession session, LearningTarget target, InteractionRun baseline) {
        this.session = Objects.requireNonNull(session);
        this.target = Objects.requireNonNull(target);
        this.baseline = Objects.requireNonNull(baseline);
        if (!session.getId().equals(baseline.getSession().getId())
                || baseline.getDefinition().getLearningTarget() == null
                || !target.getId().equals(baseline.getDefinition().getLearningTarget().getId())) {
            throw new IllegalArgumentException("Diagnóstico deve pertencer à sessão e ao objetivo do ciclo.");
        }
    }

    public void intervene(String note) {
        if (status != LearningCycleStatus.DIAGNOSED) {
            throw new IllegalArgumentException("A intervenção já foi registrada.");
        }
        if (note == null || note.isBlank() || note.trim().length() > 2000) {
            throw new IllegalArgumentException("Descreva a intervenção em até 2000 caracteres.");
        }
        interventionNote = note.trim();
        status = LearningCycleStatus.INTERVENED;
        updatedAt = Instant.now();
    }

    public void verify(InteractionRun run) {
        if (status != LearningCycleStatus.INTERVENED) {
            throw new IllegalArgumentException("Registre uma intervenção antes da verificação.");
        }
        Objects.requireNonNull(run);
        if (baseline.getId().equals(run.getId())
                || !session.getId().equals(run.getSession().getId())
                || !baseline.getDefinition().getId().equals(run.getDefinition().getId())) {
            throw new IllegalArgumentException("A verificação exige outra execução da mesma interação na sessão.");
        }
        followup = run;
        status = LearningCycleStatus.VERIFIED;
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public ClassSession getSession() { return session; }
    public LearningTarget getTarget() { return target; }
    public InteractionRun getBaseline() { return baseline; }
    public InteractionRun getFollowup() { return followup; }
    public String getInterventionNote() { return interventionNote; }
    public LearningCycleStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
