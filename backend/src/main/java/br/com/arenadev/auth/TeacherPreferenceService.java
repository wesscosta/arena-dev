package br.com.arenadev.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Teacher-chosen defaults. The session timeout keeps a class-length login
 * alive (the container default of 30 minutes expired mid-lesson); the
 * deployment default comes from APP_TEACHER_SESSION_TIMEOUT_MINUTES.
 */
@Service
public class TeacherPreferenceService {
    public static final int MIN_SESSION_TIMEOUT_MINUTES = 30;
    public static final int MAX_SESSION_TIMEOUT_MINUTES = 720;

    private final TeacherPreferenceRepository repository;
    private final int defaultSessionTimeoutMinutes;

    public TeacherPreferenceService(
            TeacherPreferenceRepository repository,
            @Value("${app.teacher.session-timeout-minutes:240}") int defaultSessionTimeoutMinutes
    ) {
        this.repository = repository;
        this.defaultSessionTimeoutMinutes = clamp(defaultSessionTimeoutMinutes);
    }

    @Transactional(readOnly = true)
    public PreferencesView get(String username) {
        int minutes = repository.findById(username)
                .map(TeacherPreference::getSessionTimeoutMinutes)
                .orElse(defaultSessionTimeoutMinutes);
        return new PreferencesView(minutes, defaultSessionTimeoutMinutes);
    }

    @Transactional
    public PreferencesView updateSessionTimeout(String username, int minutes) {
        if (minutes < MIN_SESSION_TIMEOUT_MINUTES || minutes > MAX_SESSION_TIMEOUT_MINUTES) {
            throw new IllegalArgumentException("Escolha entre 30 minutos e 12 horas para a duração da sessão.");
        }
        repository.findById(username).ifPresentOrElse(
                preference -> preference.updateSessionTimeout(minutes),
                () -> repository.save(new TeacherPreference(username, minutes))
        );
        return new PreferencesView(minutes, defaultSessionTimeoutMinutes);
    }

    private static int clamp(int minutes) {
        return Math.max(MIN_SESSION_TIMEOUT_MINUTES, Math.min(MAX_SESSION_TIMEOUT_MINUTES, minutes));
    }

    public record PreferencesView(int sessionTimeoutMinutes, int defaultSessionTimeoutMinutes) {}
}
