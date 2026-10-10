package br.com.arenadev.learning.overview;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/learning-overview")
public class SessionLearningOverviewController {
    private final SessionLearningOverviewService service;
    public SessionLearningOverviewController(SessionLearningOverviewService service) {this.service=service;}

    @GetMapping
    public SessionLearningOverviewService.OverviewView get(@PathVariable UUID sessionId) {
        return service.get(sessionId);
    }
}
