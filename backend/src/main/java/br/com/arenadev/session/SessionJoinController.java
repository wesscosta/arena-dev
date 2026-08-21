package br.com.arenadev.session;

import br.com.arenadev.realtime.QrCodeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import java.util.UUID;

@RestController
public class SessionJoinController {
    private final SessionJoinService joinService;
    private final QrCodeService qrCodeService;

    public SessionJoinController(SessionJoinService joinService, QrCodeService qrCodeService) {
        this.joinService = joinService;
        this.qrCodeService = qrCodeService;
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
    public SessionJoinService.JoinAccessView join(
            @PathVariable String code,
            @Valid @RequestBody JoinRequest request
    ) {
        return joinService.join(code, request.identity());
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

    public record JoinRequest(@NotBlank String identity) {
    }
}
