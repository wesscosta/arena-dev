package br.com.arenadev.content;

import br.com.arenadev.journey.Journey;
import br.com.arenadev.journey.JourneyRepository;
import br.com.arenadev.journey.JourneySection;
import br.com.arenadev.journey.JourneyStage;
import br.com.arenadev.content.ingestion.ContentIngestionLimits;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Saves a classroom Journey's contents to the Library as independent copies
 * (v0.11.0-rc.7). The Journey is not changed. Content already in the Library,
 * by link or by identical title and content, is skipped, so saving twice does
 * not duplicate. A copy is protected when the Journey or its source is.
 *
 * rc.8: by default the whole Journey becomes one Markdown material, with the
 * Journey as H1, each module as H2 and each content as H3, the same convention
 * the Markdown import reads back. Saving each content separately stays available.
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

    private static final Pattern HEADING = Pattern.compile("^(#{1,6})(\\s+.*)$");
    private static final Pattern FENCE = Pattern.compile("^\\s*(```|~~~).*");

    public enum Scope { JOURNEY, STAGES }

    @Transactional
    public ExportResult saveToLibrary(UUID journeyId, Scope scope) {
        return scope == Scope.STAGES ? saveContentsToLibrary(journeyId) : saveJourneyToLibrary(journeyId);
    }

    @Transactional
    public ExportResult saveJourneyToLibrary(UUID journeyId) {
        Journey journey = journeys.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Jornada não encontrada."));
        StringBuilder body = new StringBuilder("# ").append(journey.getTitle().strip()).append("\n\n");
        if (journey.getDescription() != null && !journey.getDescription().isBlank()) {
            body.append(journey.getDescription().strip()).append("\n\n");
        }
        int included = 0;
        int withoutContent = 0;
        boolean copyProtected = journey.isCopyProtected();
        Set<String> tags = new LinkedHashSet<>();
        Set<String> subjects = new LinkedHashSet<>();
        String language = null;
        JourneySection currentSection = null;
        for (JourneyStage stage : journey.getStages()) {
            LearningResource source = stage.getLearningResource();
            LearningResourceService.LibraryResourceInput content = copyOf(journey, stage, source);
            if (content == null) {
                withoutContent++;
                continue;
            }
            if (stage.getSection() != null && !Objects.equals(stage.getSection(), currentSection)) {
                currentSection = stage.getSection();
                body.append("## ").append(currentSection.getTitle().strip()).append("\n\n");
            }
            body.append("### ").append(stage.getTitle().strip()).append("\n\n");
            body.append(sectionBody(stage.getTitle(), content)).append("\n\n");
            included++;
            if (source != null) {
                copyProtected |= source.isCopyProtected();
                tags.addAll(source.getTags());
                if (source.getSubject() != null) subjects.add(source.getSubject());
                if (language == null) language = source.getLanguage();
            }
        }
        if (included == 0) return new ExportResult(0, 0, withoutContent, List.of());
        String markdown = body.toString().strip() + "\n";
        if (markdown.length() > ContentIngestionLimits.MAX_ANALYSIS_CHARACTERS) {
            String size = NumberFormat.getIntegerInstance(Locale.forLanguageTag("pt-BR")).format(markdown.length());
            throw new IllegalArgumentException("A jornada inteira tem " + size + " caracteres e o limite de um material é de 1 milhão. "
                    + "Salve os conteúdos separadamente.");
        }
        LearningResourceService.LibraryResourceInput input = new LearningResourceService.LibraryResourceInput(
                journey.getTitle().strip(), journey.getDescription(), markdown, LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, null,
                subjects.size() == 1 ? subjects.iterator().next() : null,
                List.copyOf(tags), language, copyProtected);
        if (alreadyInLibrary(input)) return new ExportResult(0, 1, withoutContent, List.of());
        UUID created = library.createLibrary(input).id();
        return new ExportResult(1, 0, withoutContent, List.of(created));
    }

    /** One content under its H3: its own headings move below H3 and a heading repeating the stage title is dropped. */
    static String sectionBody(String stageTitle, LearningResourceService.LibraryResourceInput content) {
        if (content.format() == LearningResourceFormat.LINK) {
            String label = content.sourceLabel() != null && !content.sourceLabel().isBlank() ? content.sourceLabel() : content.sourceUrl();
            String link = "[" + label.replace("]", "\\]") + "](" + content.sourceUrl() + ")";
            return content.body() != null && !content.body().isBlank() ? link + "\n\n" + content.body().strip() : link;
        }
        String text = content.body().strip();
        if (content.format() != LearningResourceFormat.MARKDOWN) return text;
        StringBuilder out = new StringBuilder();
        boolean inFence = false;
        boolean first = true;
        for (String line : text.split("\n", -1)) {
            if (FENCE.matcher(line).matches()) inFence = !inFence;
            Matcher heading = inFence ? null : HEADING.matcher(line);
            if (heading != null && heading.matches()) {
                String title = heading.group(2).strip();
                if (first && title.equalsIgnoreCase(stageTitle.strip())) { first = false; continue; }
                int level = Math.min(6, heading.group(1).length() + 3);
                line = "#".repeat(level) + heading.group(2);
            }
            if (!line.isBlank()) first = false;
            out.append(line).append('\n');
        }
        return out.toString().strip();
    }

    private boolean alreadyInLibrary(LearningResourceService.LibraryResourceInput input) {
        String sha = canonicalizer.canonicalize(input.title(), input.body(), input.format(), input.sourceUrl(),
                input.subject(), input.tags(), input.language()).contentSha256();
        return resources.findByLibraryVisibleTrueOrderByUpdatedAtDesc().stream()
                .anyMatch(existing -> sha.equals(existing.getContentSha256()) && input.title().equals(existing.getTitle()));
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
            if (alreadyInLibrary(input)) {
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
