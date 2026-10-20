package br.com.arenadev.projector;

import br.com.arenadev.realtime.QrCodeService;
import br.com.arenadev.realtime.SessionRuntimeSnapshotService;
import br.com.arenadev.session.SessionJoinService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/projector")
public class ProjectorController {
    private final SessionJoinService joinService;
    private final SessionRuntimeSnapshotService runtimeSnapshotService;
    private final QrCodeService qrCodeService;

    public ProjectorController(
            SessionJoinService joinService,
            SessionRuntimeSnapshotService runtimeSnapshotService,
            QrCodeService qrCodeService
    ) {
        this.joinService = joinService;
        this.runtimeSnapshotService = runtimeSnapshotService;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping("/{code}")
    public ProjectorView get(@PathVariable String code) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        return new ProjectorView(
                session.sessionId(),
                session.classroomName(),
                session.sessionTitle(),
                session.code(),
                session.expiresAt(),
                Instant.now(),
                runtimeSnapshotService.projector(session.sessionId())
        );
    }

    /**
     * Public like the projector itself: it encodes only the join code the
     * projector already shows, so students can scan instead of typing.
     */
    @GetMapping(value = "/{code}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(@PathVariable String code, @RequestParam String baseUrl) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(qrCodeService.joinPng(baseUrl, session.code(), 320));
    }

    public record ProjectorView(
            UUID sessionId,
            String classroomName,
            String sessionTitle,
            String code,
            Instant expiresAt,
            Instant serverTime,
            SessionRuntimeSnapshotService.PublicRuntimeSnapshot runtime
    ) {
    }
}
