package br.com.arenadev.realtime;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/buzzer")
public class BuzzerController {
    private final BuzzerService service;

    public BuzzerController(BuzzerService service) {
        this.service = service;
    }

    @GetMapping
    public BuzzerService.BuzzerStateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PostMapping("/open")
    public BuzzerService.BuzzerStateView open(@PathVariable UUID sessionId) {
        return service.open(sessionId);
    }

    @PostMapping("/close")
    public BuzzerService.BuzzerStateView close(@PathVariable UUID sessionId) {
        return service.close(sessionId);
    }
}
