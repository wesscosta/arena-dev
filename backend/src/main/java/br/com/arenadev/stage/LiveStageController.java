package br.com.arenadev.stage;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/stage")
public class LiveStageController {
    private final LiveStageService service;

    public LiveStageController(LiveStageService service) {
        this.service = service;
    }

    @GetMapping
    public LiveStageService.StateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PutMapping
    public LiveStageService.StateView activate(
            @PathVariable UUID sessionId,
            @RequestBody LiveStageService.ActivateCommand command
    ) {
        return service.activate(sessionId, command);
    }

    @PostMapping("/idle")
    public LiveStageService.StateView clear(@PathVariable UUID sessionId) {
        return service.clear(sessionId);
    }
}
