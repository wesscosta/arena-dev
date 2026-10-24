package br.com.arenadev.journey;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/journeys")
public class JourneyController {
    private final JourneyService service;

    public JourneyController(JourneyService service) { this.service = service; }

    @GetMapping
    public List<JourneyService.JourneyView> list(@RequestParam UUID classroomId) {
        return service.list(classroomId);
    }

    @GetMapping("/{id}")
    public JourneyService.JourneyView get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JourneyService.JourneyView create(@RequestBody JourneyService.JourneyInput input) {
        return service.create(input);
    }

    @PutMapping("/{id}")
    public JourneyService.JourneyView update(@PathVariable UUID id, @RequestBody JourneyService.JourneyInput input) {
        return service.update(id, input);
    }

    @PatchMapping("/{id}/release")
    public JourneyService.JourneyView release(@PathVariable UUID id, @RequestBody ReleaseInput input) {
        return service.changeRelease(id, input == null ? null : input.releasedStageCount());
    }

    public record ReleaseInput(Integer releasedStageCount) {}

    @PostMapping("/{id}/publish")
    public JourneyService.JourneyView publish(@PathVariable UUID id) { return service.publish(id); }

    @PostMapping("/{id}/archive")
    public JourneyService.JourneyView archive(@PathVariable UUID id) { return service.archive(id); }

    @PostMapping("/{id}/stages/{stageId}/refresh-resource")
    public JourneyService.JourneyView refreshStageResource(
            @PathVariable UUID id,
            @PathVariable UUID stageId
    ) {
        return service.refreshStageResource(id, stageId);
    }

    @GetMapping("/{id}/stages/{stageId}/content")
    public JourneyService.StageContentView stageContent(@PathVariable UUID id, @PathVariable UUID stageId) {
        return service.stageContent(id, stageId);
    }

    @PutMapping("/{id}/stages/{stageId}/content")
    public JourneyService.JourneyView updateStageContent(
            @PathVariable UUID id,
            @PathVariable UUID stageId,
            @RequestBody JourneyService.StageContentInput input
    ) {
        return service.updateStageContent(id, stageId, input);
    }

    @GetMapping("/{id}/progress/{enrollmentId}")
    public JourneyService.JourneyProgressView progress(@PathVariable UUID id, @PathVariable UUID enrollmentId) {
        return service.progress(id, enrollmentId);
    }

    @PostMapping("/{id}/stages/{stageId}/progress/{enrollmentId}/start")
    public JourneyService.JourneyProgressView startStage(@PathVariable UUID id, @PathVariable UUID stageId, @PathVariable UUID enrollmentId) {
        return service.startStage(id, stageId, enrollmentId);
    }

    @PostMapping("/{id}/stages/{stageId}/progress/{enrollmentId}/complete")
    public JourneyService.JourneyProgressView completeStage(@PathVariable UUID id, @PathVariable UUID stageId, @PathVariable UUID enrollmentId) {
        return service.completeStage(id, stageId, enrollmentId);
    }
}
