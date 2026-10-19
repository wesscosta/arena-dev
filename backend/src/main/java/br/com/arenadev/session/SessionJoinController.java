package br.com.arenadev.session;

import br.com.arenadev.auth.LoginRateLimitExceededException;
import br.com.arenadev.auth.LoginRateLimitService;
import br.com.arenadev.realtime.QrCodeService;
import br.com.arenadev.quiz.QuizService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Locale;
import java.util.UUID;

@RestController
public class SessionJoinController {
    private final SessionJoinService joinService;
    private final QrCodeService qrCodeService;
    private final QuizService quizService;
    private final LoginRateLimitService joinRateLimitService;

    public SessionJoinController(
            SessionJoinService joinService,
            QrCodeService qrCodeService,
            QuizService quizService,
            @org.springframework.beans.factory.annotation.Qualifier("joinRateLimitService")
            LoginRateLimitService joinRateLimitService
    ) {
        this.joinService = joinService;
        this.qrCodeService = qrCodeService;
        this.quizService = quizService;
        this.joinRateLimitService = joinRateLimitService;
    }

    @GetMapping("/api/sessions/{sessionId}/join-code")
    public SessionJoinService.JoinCodeView code(@PathVariable UUID sessionId) {
        return joinService.ensureCode(sessionId);
    }

    @PostMapping("/api/sessions/{sessionId}/join-code/rotate")
    public SessionJoinService.JoinCodeView rotate(@PathVariable UUID sessionId) {
        return joinService.rotate(sessionId);
    }

    @GetMapping(value = "/api/sessions/{sessionId}/join-code/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(
            @PathVariable UUID sessionId,
            @RequestParam String baseUrl,
            @RequestParam(defaultValue = "280") int size
    ) {
        SessionJoinService.JoinCodeView joinCode = joinService.ensureCode(sessionId);
        String normalizedBase = validateBaseUrl(baseUrl);
        String joinUrl = normalizedBase + "/join?code=" + joinCode.code();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(qrCodeService.png(joinUrl, size));
    }

    @GetMapping("/api/join/{code}")
    public SessionJoinService.PublicSessionView lookup(@PathVariable String code) {
        return joinService.lookup(code);
    }

    @PostMapping("/api/join/{code}")
    public SessionJoinService.JoinResultView join(
            @PathVariable String code,
            @Valid @RequestBody JoinRequest request,
            HttpServletRequest servletRequest
    ) {
        String key = (servletRequest.getRemoteAddr() == null ? "unknown" : servletRequest.getRemoteAddr())
                + "|" + code.trim().toUpperCase(Locale.ROOT);
        LoginRateLimitService.Decision decision = joinRateLimitService.beforeAttempt(key);
        if (!decision.allowed()) {
            throw new LoginRateLimitExceededException(
                    "Muitas tentativas de entrada. Aguarde um minuto ou fale com o professor.",
                    decision.retryAfterSeconds()
            );
        }
        try {
            SessionJoinService.JoinResultView result = joinService.join(code, request.identity(), request.rememberDevice());
            joinRateLimitService.recordSuccess(key);
            return result;
        } catch (SessionJoinService.UnknownParticipantIdentityException unknown) {
            joinRateLimitService.recordFailure(key);
            throw unknown;
        }
    }

    @PostMapping("/api/join/{code}/device/recognize")
    public SessionJoinService.DeviceRecognitionView recognizeDevice(
            @PathVariable String code,
            @Valid @RequestBody DeviceRequest request
    ) {
        return joinService.recognizeDevice(code, request.deviceToken());
    }

    @PostMapping("/api/join/{code}/device")
    public SessionJoinService.JoinAccessView joinRememberedDevice(
            @PathVariable String code,
            @Valid @RequestBody DeviceRequest request
    ) {
        return joinService.joinRememberedDevice(code, request.deviceToken());
    }

    @PostMapping("/api/join/device/revoke")
    public ResponseEntity<Void> revokeDevice(@Valid @RequestBody DeviceRequest request) {
        joinService.revokeDevice(request.deviceToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/join/{code}/quiz/{roundId}/answer")
    public QuizService.ParticipantStateView answerQuiz(
            @PathVariable String code,
            @PathVariable UUID roundId,
            @Valid @RequestBody QuizAnswerRequest request
    ) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(
                session.sessionId(),
                request.token()
        );
        return quizService.answer(
                session.sessionId(),
                roundId,
                participant.getId(),
                request.answer()
        );
    }

    private static String validateBaseUrl(String raw) {
        try {
            URI uri = URI.create(raw == null ? "" : raw.trim());
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException("Endereço público inválido para o QR Code.");
            }
            String base = uri.toString();
            return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Endereço público inválido para o QR Code.");
        }
    }

    public record JoinRequest(@NotBlank String identity, boolean rememberDevice) {
    }

    public record DeviceRequest(@NotBlank String deviceToken) {
    }

    public record QuizAnswerRequest(
            @NotBlank String token,
            @NotNull Object answer
    ) {
    }
}
