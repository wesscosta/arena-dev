package br.com.arenadev.learning;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/learning-targets")
public class LearningTargetController {
    private final LearningTargetService service;

    public LearningTargetController(LearningTargetService service) {
        this.service = service;
    }

    @GetMapping
    public List<LearningTargetService.TargetView> listActive() {
        return service.listActive();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningTargetService.TargetView create(
            @Valid @RequestBody CreateRequest request
    ) {
        return service.create(new LearningTargetService.CreateCommand(
                request.title(),
                request.type(),
                request.parentId()
        ));
    }

    @PostMapping("/{id}/archive")
    public LearningTargetService.TargetView archive(@PathVariable UUID id) {
        return service.archive(id);
    }

    public record CreateRequest(
            @NotBlank @Size(max = 180) String title,
            @NotNull LearningTargetType type,
            UUID parentId
    ) {}
}
