
package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/submissions")
public class SubmissionDashboardController {
    private final SubmissionDashboardService service;

    public SubmissionDashboardController(SubmissionDashboardService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public SubmissionDashboardService.DashboardView dashboard(@PathVariable UUID activityId) {
        return service.dashboard(activityId);
    }
}
