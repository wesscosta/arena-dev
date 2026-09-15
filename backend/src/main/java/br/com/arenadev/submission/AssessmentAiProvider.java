package br.com.arenadev.submission;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface AssessmentAiProvider {
    Result analyze(Request request);

    record Request(
            String activityTitle,
            List<CriterionInput> criteria,
            List<EvidenceInput> evidence
    ) {}

    record CriterionInput(
            UUID criterionId,
            String title,
            String description,
            BigDecimal maxPoints
    ) {}

    record EvidenceInput(
            UUID itemId,
            String kind,
            String question,
            Object studentContent,
            Object expectedAnswer,
            String explanation
    ) {}

    record Result(
            String provider,
            String model,
            String summaryFeedback,
            List<CriterionSuggestion> criteria,
            String rawResponseJson
    ) {}

    record CriterionSuggestion(
            UUID criterionId,
            BigDecimal suggestedPoints,
            String suggestedComment,
            String evidence,
            BigDecimal confidence
    ) {}
}
