package br.com.arenadev.study;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/learn/journeys")
public class JourneyStudyController {
    private final JourneyStudyService study;
    private final StudyPrincipalResolver principals;

    public JourneyStudyController(JourneyStudyService study, StudyPrincipalResolver principals) {
        this.study = study;
        this.principals = principals;
    }

    @GetMapping
    public List<JourneyStudyService.JourneyStudySummary> list(@RequestHeader("X-Study-Token") String token) {
        return study.list(principals.resolve(token));
    }

    @GetMapping("/{journeyId}")
    public JourneyStudyService.JourneyStudyView get(@PathVariable UUID journeyId, @RequestHeader("X-Study-Token") String token) {
        return study.get(journeyId, principals.resolve(token));
    }

    @GetMapping("/{journeyId}/contents/{contentId}")
    public JourneyStudyService.JourneyContentDetailView content(@PathVariable UUID journeyId, @PathVariable UUID contentId, @RequestHeader("X-Study-Token") String token) {
        return study.content(journeyId, contentId, principals.resolve(token));
    }

    @PostMapping("/{journeyId}/contents/{contentId}/start")
    public JourneyStudyService.JourneyStudyView start(@PathVariable UUID journeyId, @PathVariable UUID contentId, @RequestHeader("X-Study-Token") String token) {
        return study.start(journeyId, contentId, principals.resolve(token));
    }

    @PostMapping("/{journeyId}/contents/{contentId}/complete")
    public JourneyStudyService.JourneyStudyView complete(@PathVariable UUID journeyId, @PathVariable UUID contentId, @RequestHeader("X-Study-Token") String token) {
        return study.complete(journeyId, contentId, principals.resolve(token));
    }
}
