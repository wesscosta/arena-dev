package br.com.arenadev.activity;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/steps")
public class ActivityStepController {
    private final ActivityStepService service;

    public ActivityStepController(ActivityStepService service) {
        this.service = service;
    }

    @GetMapping
    public List<ActivityStepService.StepView> list(@PathVariable UUID activityId) {
        return service.list(activityId);
    }

    @PutMapping
    public List<ActivityStepService.StepView> replace(
            @PathVariable UUID activityId,
            @RequestBody List<ActivityStepService.StepInput> input
    ) {
        return service.replace(activityId, input);
    }
}
