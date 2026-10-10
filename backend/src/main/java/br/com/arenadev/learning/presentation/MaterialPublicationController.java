package br.com.arenadev.learning.presentation;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
public class MaterialPublicationController {
    private final MaterialPublicationService service;
    public MaterialPublicationController(MaterialPublicationService service) { this.service = service; }

    @PostMapping("/api/sessions/{sessionId}/material-presentation")
    public ResponseEntity<MaterialPublicationService.PublicationView> publish(
            @PathVariable UUID sessionId, @RequestBody MaterialPublicationService.PublishCommand request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.publish(sessionId, request));
    }

    @DeleteMapping("/api/sessions/{sessionId}/material-presentation")
    public MaterialPublicationService.PublicationView withdraw(
            @PathVariable UUID sessionId, @RequestBody MaterialPublicationService.WithdrawCommand request) {
        return service.withdraw(sessionId, request);
    }

    @PutMapping("/api/sessions/{sessionId}/material-presentation/section")
    public br.com.arenadev.stage.LiveStageService.StateView section(
            @PathVariable UUID sessionId,
            @RequestBody MaterialPublicationService.SectionCommand request) {
        return service.navigate(sessionId, request);
    }

    @GetMapping("/api/sessions/{sessionId}/material-presentation")
    public MaterialPublicationService.PublicationView current(@PathVariable UUID sessionId) {
        return service.current(sessionId);
    }

    @GetMapping("/api/projector/{code}/material")
    public ResponseEntity<MaterialPublicationService.PublicMaterialView> publicContent(@PathVariable String code) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.publicMaterial(code));
        } catch (br.com.arenadev.shared.ResourceNotFoundException |
                 IllegalArgumentException unavailable) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build();
        } catch (org.springframework.web.server.ResponseStatusException unavailable) {
            if (unavailable.getStatusCode().value() != 404
                    && unavailable.getStatusCode().value() != 410) throw unavailable;
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build();
        }
    }
}
