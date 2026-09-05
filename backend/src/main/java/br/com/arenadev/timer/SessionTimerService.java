package br.com.arenadev.timer;

import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class SessionTimerService {
    public static final int MAX_DURATION_SECONDS = 86_400;
    public static final int MAX_EXTENSION_SECONDS = 3_600;

    private static final EnumSet<TimerStatus> OPEN_STATUSES = EnumSet.of(
            TimerStatus.READY,
            TimerStatus.RUNNING,
            TimerStatus.PAUSED
    );

    private final SessionTimerRepository timerRepository;
    private final ClassSessionRepository sessionRepository;
    private final SessionRealtimeGateway realtimeGateway;

    public SessionTimerService(
            SessionTimerRepository timerRepository,
            ClassSessionRepository sessionRepository,
            SessionRealtimeGateway realtimeGateway
    ) {
        this.timerRepository = timerRepository;
        this.sessionRepository = sessionRepository;
        this.realtimeGateway = realtimeGateway;
    }

    @Transactional
    public TimerView create(UUID sessionId, CreateTimer command) {
        ClassSession session = getSessionForUpdate(sessionId);
        ensureActiveSession(session);
        validateDuration(command.durationSeconds());

        Instant now = Instant.now();
        List<SessionTimer> openTimers = timerRepository.findOpenBySessionIdForUpdate(
                sessionId,
                OPEN_STATUSES
        );
        openTimers.forEach(timer -> timer.refreshExpired(now));
        timerRepository.flush();

        if (openTimers.stream().anyMatch(SessionTimer::isOpen)) {
            throw new IllegalArgumentException("Já existe um timer ativo para esta sessão.");
        }

        SessionTimer timer = timerRepository.save(new SessionTimer(
                session,
                normalizeTitle(command.title()),
                normalizeInstructions(command.instructions()),
                command.durationSeconds()
        ));
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public List<TimerView> list(UUID sessionId) {
        getSession(sessionId);
        Instant now = Instant.now();

        return timerRepository.findBySessionIdOrderByCreatedAtDesc(sessionId)
                .stream()
                .peek(timer -> timer.refreshExpired(now))
                .map(timer -> TimerView.from(timer, now))
                .toList();
    }

    @Transactional
    public TimerView get(UUID sessionId, UUID timerId) {
        getSession(sessionId);
        Instant now = Instant.now();
        SessionTimer timer = getTimer(timerId);
        ensureBelongsToSession(timer, sessionId);
        timer.refreshExpired(now);
        return TimerView.from(timer, now);
    }

    @Transactional
    public TimerView start(UUID sessionId, UUID timerId) {
        ensureActiveSession(getSession(sessionId));

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.refreshExpired(now);
        timer.start(now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerView pause(UUID sessionId, UUID timerId) {
        ensureActiveSession(getSession(sessionId));

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.pause(now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerView resume(UUID sessionId, UUID timerId) {
        ensureActiveSession(getSession(sessionId));

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.refreshExpired(now);
        timer.resume(now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerView extend(UUID sessionId, UUID timerId, int seconds) {
        ensureActiveSession(getSession(sessionId));
        validateExtension(seconds);

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.refreshExpired(now);

        if ((long) timer.getDurationSeconds() + seconds > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException("A duração total do timer não pode ultrapassar 24 horas.");
        }

        timer.extend(seconds, now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerView finish(UUID sessionId, UUID timerId) {
        ensureActiveSession(getSession(sessionId));

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.finish(now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerView cancel(UUID sessionId, UUID timerId) {
        ensureActiveSession(getSession(sessionId));

        Instant now = Instant.now();
        SessionTimer timer = lockTimer(sessionId, timerId);
        timer.cancel(now);
        TimerView view = TimerView.from(timer, now);
        broadcastStateAfterCommit(sessionId, view);
        return view;
    }

    @Transactional
    public TimerStateView state(UUID sessionId) {
        getSession(sessionId);
        Instant now = Instant.now();

        return timerRepository.findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
                .map(timer -> {
                    timer.refreshExpired(now);
                    return TimerStateView.from(timer, now);
                })
                .orElseGet(TimerStateView::empty);
    }

    @Transactional
    public void cancelOpenForFinishedSession(UUID sessionId) {
        Instant now = Instant.now();
        List<SessionTimer> openTimers = timerRepository.findOpenBySessionIdForUpdate(
                sessionId,
                OPEN_STATUSES
        );
        openTimers.forEach(timer -> timer.cancel(now));

        if (!openTimers.isEmpty()) {
            broadcastStateAfterCommit(
                    sessionId,
                    TimerView.from(openTimers.getFirst(), now)
            );
        }
    }

    private void broadcastStateAfterCommit(UUID sessionId, TimerView timer) {
        TimerStateView state = new TimerStateView(timer);
        realtimeGateway.broadcastAfterCommit(
                sessionId,
                "TIMER_STATE",
                state
        );
        realtimeGateway.broadcastProjectorsAfterCommit(
                sessionId,
                "TIMER_STATE",
                state
        );
    }

    private SessionTimer lockTimer(UUID sessionId, UUID timerId) {
        SessionTimer timer = timerRepository.findByIdForUpdate(timerId)
                .orElseThrow(() -> new ResourceNotFoundException("Timer não encontrado."));
        ensureBelongsToSession(timer, sessionId);
        return timer;
    }

    private SessionTimer getTimer(UUID timerId) {
        return timerRepository.findById(timerId)
                .orElseThrow(() -> new ResourceNotFoundException("Timer não encontrado."));
    }

    private ClassSession getSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private ClassSession getSessionForUpdate(UUID sessionId) {
        return sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private static void ensureBelongsToSession(SessionTimer timer, UUID sessionId) {
        if (!timer.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("Timer não pertence à sessão informada.");
        }
    }

    private static void ensureActiveSession(ClassSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
    }

    private static void validateDuration(int seconds) {
        if (seconds < 1 || seconds > MAX_DURATION_SECONDS) {
            throw new IllegalArgumentException(
                    "A duração do timer deve estar entre 1 segundo e 24 horas."
            );
        }
    }

    private static void validateExtension(int seconds) {
        if (seconds < 1 || seconds > MAX_EXTENSION_SECONDS) {
            throw new IllegalArgumentException(
                    "A extensão deve estar entre 1 segundo e 60 minutos."
            );
        }
    }

    private static String normalizeTitle(String title) {
        String normalized = title == null ? "" : title.trim();

        if (normalized.isBlank()) {
            return "Atividade cronometrada";
        }
        if (normalized.length() > 160) {
            throw new IllegalArgumentException(
                    "O título do timer deve ter no máximo 160 caracteres."
            );
        }
        return normalized;
    }

    private static String normalizeInstructions(String instructions) {
        if (instructions == null || instructions.isBlank()) {
            return null;
        }

        String normalized = instructions.trim();
        if (normalized.length() > 500) {
            throw new IllegalArgumentException(
                    "As instruções do timer devem ter no máximo 500 caracteres."
            );
        }
        return normalized;
    }

    public record CreateTimer(
            String title,
            String instructions,
            int durationSeconds
    ) {
    }

    public record TimerStateView(TimerView timer) {
        static TimerStateView empty() {
            return new TimerStateView(null);
        }

        static TimerStateView from(SessionTimer timer, Instant now) {
            return new TimerStateView(TimerView.from(timer, now));
        }
    }

    public record TimerView(
            UUID id,
            UUID sessionId,
            String title,
            String instructions,
            TimerStatus status,
            int durationSeconds,
            int remainingSeconds,
            Instant startedAt,
            Instant endsAt,
            Instant pausedAt,
            Instant finishedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        static TimerView from(SessionTimer timer, Instant now) {
            return new TimerView(
                    timer.getId(),
                    timer.getSession().getId(),
                    timer.getTitle(),
                    timer.getInstructions(),
                    timer.getStatus(),
                    timer.getDurationSeconds(),
                    timer.remainingSeconds(now),
                    timer.getStartedAt(),
                    timer.getEndsAt(),
                    timer.getPausedAt(),
                    timer.getFinishedAt(),
                    timer.getCreatedAt(),
                    timer.getUpdatedAt()
            );
        }
    }
}
