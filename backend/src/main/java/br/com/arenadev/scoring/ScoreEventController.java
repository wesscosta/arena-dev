package br.com.arenadev.scoring;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/score-events")
public class ScoreEventController {
    private final ScoreEventService service;

    public ScoreEventController(ScoreEventService service) {
        this.service = service;
    }

    @GetMapping
    public List<ScoreEventService.ScoreEventView> list(@RequestParam UUID classroomId) {
        return service.list(classroomId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScoreEventService.ScoreEventView create(@Valid @RequestBody ScoreEventRequest request) {
        return service.create(request.toCommand());
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ScoreEventService.ScoreEventView> createBatch(@Valid @RequestBody List<ScoreEventRequest> requests) {
        return service.createBatch(requests.stream().map(ScoreEventRequest::toCommand).toList());
    }

    @PostMapping("/{id}/reverse")
    @ResponseStatus(HttpStatus.CREATED)
    public ScoreEventService.ScoreEventView reverse(@PathVariable UUID id) {
        return service.reverse(id);
    }

    public record ScoreEventRequest(
            @NotNull UUID classroomId,
            @NotNull UUID studentId,
            UUID sessionId,
            int points,
            @NotNull ScoreCategory category,
            String description,
            ScoreSource source,
            String activityId,
            String questionId
    ) {
        ScoreEventService.CreateScoreEvent toCommand() {
            return new ScoreEventService.CreateScoreEvent(
                    classroomId,
                    studentId,
                    sessionId,
                    points,
                    category,
                    description,
                    source,
                    activityId,
                    questionId
            );
        }
    }
}
