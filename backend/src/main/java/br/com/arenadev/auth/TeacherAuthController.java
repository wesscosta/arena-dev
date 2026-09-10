package br.com.arenadev.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class TeacherAuthController {
    private final AuthenticationManager authenticationManager;
    private final LoginRateLimitService loginRateLimitService;

    public TeacherAuthController(
            AuthenticationManager authenticationManager,
            LoginRateLimitService loginRateLimitService
    ) {
        this.authenticationManager = authenticationManager;
        this.loginRateLimitService = loginRateLimitService;
    }

    @GetMapping("/csrf")
    public CsrfTokenView csrf(CsrfToken token) {
        return new CsrfTokenView(token.getToken());
    }

    @PostMapping("/login")
    public TeacherSessionView login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String rateLimitKey = loginRateLimitKey(servletRequest, request.username());
        LoginRateLimitService.Decision decision = loginRateLimitService.beforeAttempt(rateLimitKey);
        if (!decision.allowed()) {
            throw new LoginRateLimitExceededException(decision.retryAfterSeconds());
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password())
            );
        } catch (AuthenticationException exception) {
            loginRateLimitService.recordFailure(rateLimitKey);
            throw exception;
        }
        loginRateLimitService.recordSuccess(rateLimitKey);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        HttpSession session = servletRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return TeacherSessionView.from(authentication);
    }

    @GetMapping("/session")
    public TeacherSessionView session(Authentication authentication) {
        return TeacherSessionView.from(authentication);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    private String loginRateLimitKey(HttpServletRequest request, String username) {
        String remoteAddress = request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
        return remoteAddress + "|" + username.trim().toLowerCase(Locale.ROOT);
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record CsrfTokenView(String token) {}

    public record TeacherSessionView(String username, String role) {
        static TeacherSessionView from(Authentication authentication) {
            return new TeacherSessionView(authentication.getName(), "TEACHER");
        }
    }
}
