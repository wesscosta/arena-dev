package br.com.arenadev.content;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/learning-resources")
public class LearningResourceController {
    private final LearningResourceService service;

    public LearningResourceController(LearningResourceService service) {
        this.service = service;
    }

    @GetMapping
    public List<LearningResourceService.ResourceView> list(@RequestParam UUID classroomId) {
        return service.list(classroomId);
    }

    @GetMapping("/{id}")
    public LearningResourceService.ResourceView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningResourceService.ResourceView create(
            @RequestBody LearningResourceService.ResourceInput input
    ) {
        return service.create(input);
    }

    @PutMapping("/{id}")
    public LearningResourceService.ResourceView update(
            @PathVariable UUID id,
            @RequestBody LearningResourceService.ResourceInput input
    ) {
        return service.update(id, input);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
