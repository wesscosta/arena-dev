package br.com.arenadev.submission;

import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}")
public class AssessmentRubricController {
    private final AssessmentRubricService service;

    public AssessmentRubricController(AssessmentRubricService service) {
        this.service = service;
    }

    @GetMapping("/rubric")
    public AssessmentRubricService.RubricView rubric(@PathVariable UUID activityId) {
        return service.rubric(activityId);
    }

    @PutMapping("/rubric")
    public AssessmentRubricService.RubricView replaceRubric(
            @PathVariable UUID activityId,
            @RequestBody RubricRequest request
    ) {
        return service.replaceRubric(activityId, request.criteria());
    }

    @GetMapping("/submissions/{submissionId}/assessment")
    public AssessmentRubricService.AssessmentView assessment(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.assessment(activityId, submissionId);
    }

    @PutMapping("/submissions/{submissionId}/assessment/criteria/{criterionId}")
    public AssessmentRubricService.AssessmentView score(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @PathVariable UUID criterionId,
            @RequestBody ScoreRequest request
    ) {
        return service.score(activityId, submissionId, criterionId, request.awardedPoints(), request.teacherComment());
    }

    @PostMapping("/submissions/{submissionId}/assessment/grade")
    public AssessmentRubricService.AssessmentView grade(
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId
    ) {
        return service.grade(activityId, submissionId);
    }

    public record RubricRequest(List<AssessmentRubricService.RubricCriterionInput> criteria) {}
    public record ScoreRequest(BigDecimal awardedPoints, String teacherComment) {}
}
