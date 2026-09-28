package br.com.arenadev.content.ingestion;

import org.springframework.stereotype.Service;

/**
 * Optional AI assistance for ambiguous extracted material. The deterministic draft
 * remains the fallback and the provider never becomes required for ingestion.
 */
@Service
public class JourneyStructureFallbackService {
    private final JourneyDraftAiProvider provider;

    public JourneyStructureFallbackService(JourneyDraftAiProvider provider) {
        this.provider = provider;
    }

    public FallbackResult improveIfUseful(
            ContentIngestionService.PreviewRequest request,
            ContentIngestionService.DraftView deterministic,
            StructureAssessment assessment
    ) {
        if (!assessment.aiRecommended()) {
            return new FallbackResult(deterministic, false, "DETERMINISTIC_CONFIDENT");
        }
        if (!provider.isConfigured()) {
            return new FallbackResult(deterministic, false, "AI_UNAVAILABLE");
        }
        try {
            var aiRequest = new ContentIngestionService.PreviewRequest(
                    request.classroomId(), ContentIngestionSource.AI,
                    request.title(), request.description(), null,
                    request.content(), request.sourceUrl(), request.sourceLabel()
            );
            var suggested = provider.generate(aiRequest);
            if (suggested == null || suggested.sections() == null || suggested.sections().isEmpty()) {
                return new FallbackResult(deterministic, false, "AI_INVALID_RESPONSE");
            }
            // Preserve provenance of the original material. AI is a transformation,
            // not the source of the teacher's content.
            return new FallbackResult(
                    new ContentIngestionService.DraftView(
                            suggested.title(), suggested.description(), deterministic.source(),
                            deterministic.sourceLabel(), suggested.sections(),
                            new ContentIngestionService.StructureAnalysis(
                                    "AI_ASSISTED", assessment.confidence(), true,
                                    "Estrutura ambígua reorganizada com assistência de IA; revisão humana obrigatória."
                            )
                    ),
                    true,
                    "AI_ASSISTED"
            );
        } catch (RuntimeException ignored) {
            // Provider outages must not break import. The teacher keeps the
            // deterministic draft and can review it manually.
            return new FallbackResult(deterministic, false, "AI_FAILED");
        }
    }

    public record StructureAssessment(double confidence, boolean aiRecommended, String reason) {}
    public record FallbackResult(ContentIngestionService.DraftView draft, boolean aiUsed, String outcome) {}
}
