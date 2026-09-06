package br.com.arenadev.dynamic;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/mechanics")
public class MechanicsController {
    private final MechanicsService service;

    public MechanicsController(MechanicsService service) { this.service = service; }

    @GetMapping
    public MechanicsService.RuntimeView runtime(@PathVariable UUID sessionId) { return service.getRuntime(sessionId); }

    @PostMapping("/draw")
    public MechanicsService.DrawResult draw(@PathVariable UUID sessionId) { return service.draw(sessionId); }

    @PostMapping("/groups")
    public MechanicsService.GroupsResult groups(@PathVariable UUID sessionId, @RequestBody GroupsInput input) {
        return service.organizeGroups(sessionId, input.groupSize());
    }

    @PostMapping("/boss")
    public MechanicsService.RuntimeView startBoss(@PathVariable UUID sessionId, @RequestBody BossInput input) {
        return service.startBoss(sessionId, input.name(), input.maxHp());
    }

    @PostMapping("/boss/damage")
    public MechanicsService.RuntimeView damageBoss(@PathVariable UUID sessionId, @RequestBody DamageInput input) {
        return service.damageBoss(sessionId, input.amount());
    }

    @PutMapping("/arena")
    public MechanicsService.RuntimeView arenaSource(@PathVariable UUID sessionId, @RequestBody ArenaInput input) {
        return service.setArenaSource(sessionId, input.activityId());
    }

    @PostMapping("/arena/next")
    public MechanicsService.ArenaQuestionResult nextQuestion(@PathVariable UUID sessionId) {
        return service.nextArenaQuestion(sessionId);
    }

    @PostMapping("/arena/restart")
    public MechanicsService.RuntimeView restartQuestions(@PathVariable UUID sessionId) {
        return service.restartArenaQuestions(sessionId);
    }

    @GetMapping("/arena/flow")
    public MechanicsService.LiveFlowView liveFlow(@PathVariable UUID sessionId) {
        return service.getLiveFlow(sessionId);
    }

    @PostMapping("/arena/flow/start")
    public MechanicsService.LiveFlowResult startFlow(@PathVariable UUID sessionId) {
        return service.startLiveFlow(sessionId);
    }

    @PostMapping("/arena/flow/next")
    public MechanicsService.LiveFlowResult nextFlow(@PathVariable UUID sessionId) {
        return service.nextLiveFlow(sessionId);
    }

    @PostMapping("/arena/flow/previous")
    public MechanicsService.LiveFlowResult previousFlow(@PathVariable UUID sessionId) {
        return service.previousLiveFlow(sessionId);
    }

    public record GroupsInput(int groupSize) {}
    public record BossInput(String name, int maxHp) {}
    public record DamageInput(int amount) {}
    public record ArenaInput(UUID activityId) {}
}
