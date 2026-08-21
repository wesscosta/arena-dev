package br.com.arenadev.activity;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {
    private final ActivityService service;

    public ActivityController(ActivityService service) { this.service = service; }

    @GetMapping
    public List<ActivityService.ActivityView> list(@RequestParam UUID classroomId) {
        return service.list(classroomId);
    }

    @GetMapping("/{id}")
    public ActivityService.ActivityView get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityService.ActivityView create(@RequestBody ActivityService.ActivityInput input) {
        return service.create(input);
    }

    @PutMapping("/{id}")
    public ActivityService.ActivityView update(@PathVariable UUID id, @RequestBody ActivityService.ActivityInput input) {
        return service.update(id, input);
    }

    @PostMapping("/{id}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityService.ActivityView copy(@PathVariable UUID id, @RequestBody ActivityService.CopyInput input) {
        if (input == null || input.destinationClassroomId() == null) throw new IllegalArgumentException("Turma de destino é obrigatória.");
        return service.copy(id, input.destinationClassroomId());
    }
}
