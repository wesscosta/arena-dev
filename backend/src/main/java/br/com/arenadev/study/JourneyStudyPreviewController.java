package br.com.arenadev.study;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Teacher-authenticated adapter over the same study projection used by students. */
@RestController
@RequestMapping("/api/journeys/{journeyId}/study-preview")
public class JourneyStudyPreviewController {
    private final JourneyStudyService service;

    public JourneyStudyPreviewController(JourneyStudyService service) {
        this.service = service;
    }

    @GetMapping
    public JourneyStudyService.JourneyStudyView get(@PathVariable UUID journeyId) {
        return service.preview(journeyId);
    }

    @GetMapping("/contents/{contentId}")
    public JourneyStudyService.JourneyContentDetailView content(
            @PathVariable UUID journeyId,
            @PathVariable UUID contentId
    ) {
        return service.previewContent(journeyId, contentId);
    }
}
