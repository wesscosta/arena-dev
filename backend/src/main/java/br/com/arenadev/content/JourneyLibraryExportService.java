package br.com.arenadev.content;

import br.com.arenadev.journey.Journey;
import br.com.arenadev.journey.JourneyRepository;
import br.com.arenadev.journey.JourneyStage;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Saves a classroom Journey's contents to the Library as independent copies
 * (v0.11.0-rc.7). The Journey is not changed. Content already in the Library,
 * by link or by identical title and content, is skipped, so saving twice does
 * not duplicate. A copy is protected when the Journey or its source is.
 */
@Service
public class JourneyLibraryExportService {
    private final JourneyRepository journeys;
    private final LearningResourceRepository resources;
    private final LearningResourceService library;
    private final ContentCanonicalizer canonicalizer;

    public JourneyLibraryExportService(JourneyRepository journeys, LearningResourceRepository resources,
                                       LearningResourceService library, ContentCanonicalizer canonicalizer) {
        this.journeys = journeys;
        this.resources = resources;
        this.library = library;
        this.canonicalizer = canonicalizer;
    }

    @Transactional
    public ExportResult saveContentsToLibrary(UUID journeyId) {
        Journey journey = journeys.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Jornada não encontrada."));
        List<UUID> created = new ArrayList<>();
        int alreadyInLibrary = 0;
        int withoutContent = 0;
        for (JourneyStage stage : journey.getStages()) {
            LearningResource source = stage.getLearningResource();
            if (source != null && source.isLibraryVisible()) {
                alreadyInLibrary++;
                continue;
            }
            LearningResourceService.LibraryResourceInput input = copyOf(journey, stage, source);
            if (input == null) {
                withoutContent++;
                continue;
            }
            String sha = canonicalizer.canonicalize(input.title(), input.body(), input.format(), input.sourceUrl(),
                    input.subject(), input.tags(), input.language()).contentSha256();
            boolean duplicate = resources.findByLibraryVisibleTrueOrderByUpdatedAtDesc().stream()
                    .anyMatch(existing -> sha.equals(existing.getContentSha256()) && input.title().equals(existing.getTitle()));
            if (duplicate) {
                alreadyInLibrary++;
                continue;
            }
            created.add(library.createLibrary(input).id());
        }
        return new ExportResult(created.size(), alreadyInLibrary, withoutContent, created);
    }

    private static LearningResourceService.LibraryResourceInput copyOf(Journey journey, JourneyStage stage, LearningResource source) {
        boolean snapshot = stage.getResourceSnapshotFormat() != null;
        String body = snapshot ? stage.getResourceSnapshotBody() : source == null ? null : source.getBody();
        String sourceUrl = snapshot ? stage.getResourceSnapshotSourceUrl() : source == null ? null : source.getSourceUrl();
        String sourceLabel = snapshot ? stage.getResourceSnapshotSourceLabel() : source == null ? null : source.getSourceLabel();
        LearningResourceFormat format = snapshot ? LearningResourceFormat.valueOf(stage.getResourceSnapshotFormat())
                : source == null ? null : source.getFormat();
        boolean hasContent = (body != null && !body.isBlank()) || (format == LearningResourceFormat.LINK && sourceUrl != null);
        if (format == null || !hasContent) return null;
        return new LearningResourceService.LibraryResourceInput(
                stage.getTitle(),
                stage.getDescription() != null ? stage.getDescription() : source == null ? null : source.getSummary(),
                body,
                format,
                source == null ? LearningResourceSourceType.MANUAL : source.getSourceType(),
                sourceUrl,
                sourceLabel,
                source == null ? null : source.getSubject(),
                source == null ? List.of() : List.copyOf(source.getTags()),
                source == null ? null : source.getLanguage(),
                journey.isCopyProtected() || (source != null && source.isCopyProtected()));
    }

    public record ExportResult(int created, int alreadyInLibrary, int withoutContent, List<UUID> createdIds) {}
}
