package br.com.arenadev.ranking;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/ranking")
public class SessionRankingController {
    private final SessionRankingService service;

    public SessionRankingController(SessionRankingService service) {
        this.service = service;
    }

    @GetMapping
    public SessionRankingService.RankingStateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PutMapping("/presentation")
    public SessionRankingService.RankingStateView updatePresentation(
            @PathVariable UUID sessionId,
            @RequestBody SessionRankingService.PresentationCommand command
    ) {
        return service.updatePresentation(sessionId, command);
    }
}
