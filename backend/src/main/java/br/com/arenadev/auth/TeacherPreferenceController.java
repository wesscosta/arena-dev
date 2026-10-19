package br.com.arenadev.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher/preferences")
public class TeacherPreferenceController {
    private final TeacherPreferenceService preferences;

    public TeacherPreferenceController(TeacherPreferenceService preferences) {
        this.preferences = preferences;
    }

    @GetMapping
    public TeacherPreferenceService.PreferencesView get(Authentication authentication) {
        return preferences.get(authentication.getName());
    }

    @PutMapping
    public TeacherPreferenceService.PreferencesView update(
            Authentication authentication,
            @Valid @RequestBody UpdateRequest request,
            HttpServletRequest servletRequest
    ) {
        TeacherPreferenceService.PreferencesView view =
                preferences.updateSessionTimeout(authentication.getName(), request.sessionTimeoutMinutes());
        // Applies to the current login too, not only to the next one.
        HttpSession session = servletRequest.getSession(false);
        if (session != null) session.setMaxInactiveInterval(view.sessionTimeoutMinutes() * 60);
        return view;
    }

    public record UpdateRequest(@NotNull Integer sessionTimeoutMinutes) {}
}
