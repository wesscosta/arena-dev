
package br.com.arenadev.submission;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController
@RequestMapping("/api/activities/{activityId}/integrations")
public class LearningPlatformIntegrationController {
    private final LearningPlatformIntegrationService service;
    public LearningPlatformIntegrationController(LearningPlatformIntegrationService service) { this.service = service; }
    @GetMapping public LearningPlatformIntegrationService.IntegrationOverview overview(@PathVariable UUID activityId) { return service.overview(activityId); }
    @PutMapping("/{provider}") public LearningPlatformIntegrationService.IntegrationOverview link(@PathVariable UUID activityId, @PathVariable LearningPlatformProvider provider, @RequestBody LearningPlatformIntegrationService.LinkActivityCommand command) { return service.linkActivity(activityId, provider, command); }
    @GetMapping("/{provider}/submissions/{submissionId}/feedback-export-preview")
    public LearningPlatformIntegrationService.FeedbackExportPreview preview(@PathVariable UUID activityId, @PathVariable LearningPlatformProvider provider, @PathVariable UUID submissionId) { return service.feedbackExportPreview(activityId, submissionId, provider); }
}
