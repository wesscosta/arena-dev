package br.com.arenadev.learning.placement;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/contextual-material")
public class ArenaResourcePlacementController {
    private final ArenaResourcePlacementService service;
    public ArenaResourcePlacementController(ArenaResourcePlacementService service) {this.service=service;}

    @GetMapping
    public ArenaResourcePlacementService.PlacementView get(@PathVariable UUID sessionId) {
        return service.get(sessionId);
    }

    @PutMapping
    public ArenaResourcePlacementService.PlacementView link(@PathVariable UUID sessionId,
                                                             @Valid @RequestBody LinkCommand command) {
        return service.link(sessionId,command.resourceId());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@PathVariable UUID sessionId) {service.unlink(sessionId);}

    public record LinkCommand(@NotNull UUID resourceId) {}
}
