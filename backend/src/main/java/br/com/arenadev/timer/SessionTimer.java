package br.com.arenadev.timer;

import br.com.arenadev.session.ClassSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_timers")
public class SessionTimer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 500)
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TimerStatus status = TimerStatus.READY;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "remaining_seconds", nullable = false)
    private int remainingSeconds;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected SessionTimer() {
    }

    public SessionTimer(ClassSession session, String title, String instructions, int durationSeconds) {
        this.session = session;
        this.title = title;
        this.instructions = instructions;
        this.durationSeconds = durationSeconds;
        this.remainingSeconds = durationSeconds;
    }

    public UUID getId() {
        return id;
    }

    public ClassSession getSession() {
        return session;
    }

    public String getTitle() {
        return title;
    }

    public String getInstructions() {
        return instructions;
    }

    public TimerStatus getStatus() {
        return status;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public Instant getPausedAt() {
        return pausedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isOpen() {
        return status == TimerStatus.READY
                || status == TimerStatus.RUNNING
                || status == TimerStatus.PAUSED;
    }

    public int remainingSeconds(Instant now) {
        if (status != TimerStatus.RUNNING || endsAt == null) {
            return remainingSeconds;
        }
        return secondsUntil(now, endsAt);
    }

    public void start(Instant now) {
        requireStatus(TimerStatus.READY, "Timer precisa estar pronto para iniciar.");

        status = TimerStatus.RUNNING;
        startedAt = now;
        pausedAt = null;
        endsAt = now.plusSeconds(remainingSeconds);
        updatedAt = now;
    }

    public void pause(Instant now) {
        refreshExpired(now);
        requireStatus(TimerStatus.RUNNING, "Timer precisa estar em execução para pausar.");

        remainingSeconds = secondsUntil(now, endsAt);
        status = TimerStatus.PAUSED;
        pausedAt = now;
        endsAt = null;
        updatedAt = now;
    }

    public void resume(Instant now) {
        requireStatus(TimerStatus.PAUSED, "Timer precisa estar pausado para continuar.");

        if (remainingSeconds <= 0) {
            finishExpired(now);
            return;
        }

        status = TimerStatus.RUNNING;
        pausedAt = null;
        endsAt = now.plusSeconds(remainingSeconds);
        updatedAt = now;
    }

    public void extend(int seconds, Instant now) {
        refreshExpired(now);
        if (!isOpen()) {
            throw new IllegalArgumentException("Timer finalizado ou cancelado não pode ser estendido.");
        }

        durationSeconds += seconds;
        if (status == TimerStatus.RUNNING) {
            endsAt = endsAt.plusSeconds(seconds);
        } else {
            remainingSeconds += seconds;
        }
        updatedAt = now;
    }

    public void finish(Instant now) {
        refreshExpired(now);
        if (status != TimerStatus.RUNNING && status != TimerStatus.PAUSED) {
            throw new IllegalArgumentException(
                    "Somente um timer em execução ou pausado pode ser finalizado."
            );
        }

        status = TimerStatus.FINISHED;
        remainingSeconds = 0;
        endsAt = now;
        pausedAt = null;
        finishedAt = now;
        updatedAt = now;
    }

    public void cancel(Instant now) {
        refreshExpired(now);
        if (!isOpen()) {
            return;
        }

        if (status == TimerStatus.RUNNING) {
            remainingSeconds = secondsUntil(now, endsAt);
        }

        status = TimerStatus.CANCELLED;
        endsAt = null;
        pausedAt = null;
        finishedAt = now;
        updatedAt = now;
    }

    public void refreshExpired(Instant now) {
        if (status == TimerStatus.RUNNING && endsAt != null && !endsAt.isAfter(now)) {
            finishExpired(endsAt);
        }
    }

    private void finishExpired(Instant when) {
        status = TimerStatus.FINISHED;
        remainingSeconds = 0;
        finishedAt = when;
        updatedAt = when;
    }

    private void requireStatus(TimerStatus expected, String message) {
        if (status != expected) {
            throw new IllegalArgumentException(message);
        }
    }

    private static int secondsUntil(Instant now, Instant target) {
        long millis = Math.max(0, Duration.between(now, target).toMillis());
        return (int) Math.min(Integer.MAX_VALUE, (millis + 999) / 1000);
    }
}
