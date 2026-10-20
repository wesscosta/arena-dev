package br.com.arenadev.content;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LearningResourceService {
    private final LearningResourceRepository resources;
    private final ClassroomRepository classrooms;
    private final ContentCanonicalizer canonicalizer;
    private final JsonMapper objectMapper;
    private final br.com.arenadev.stage.LiveStageService liveStage;

    public LearningResourceService(
            LearningResourceRepository resources,
            ClassroomRepository classrooms,
            ContentCanonicalizer canonicalizer,
            JsonMapper objectMapper,
            br.com.arenadev.stage.LiveStageService liveStage
    ) {
        this.resources = resources;
        this.classrooms = classrooms;
        this.canonicalizer = canonicalizer;
        this.objectMapper = objectMapper;
        this.liveStage = liveStage;
    }

    @Transactional(readOnly = true)
    public List<ResourceView> list(UUID classroomId) {
        requireClassroom(classroomId);
        return resources.findByClassroomIdOrderByUpdatedAtDesc(classroomId)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ResourceView> listLibrary(
            String query,
            boolean archived,
            String subject,
            String tag,
            String language,
            LibrarySort sort
    ) {
        String normalizedQuery = normalizeForSearch(query);
        String normalizedSubject = normalizeForSearch(subject);
        String normalizedTag = normalizeForSearch(tag);
        String normalizedLanguage = normalizeForSearch(language);

        List<LearningResource> base = archived
                ? resources.findByArchivedAtIsNotNullOrderByUpdatedAtDesc()
                : resources.findByLibraryVisibleTrueOrderByUpdatedAtDesc();

        Comparator<LearningResource> comparator = switch (sort == null ? LibrarySort.RECENT : sort) {
            case TITLE_ASC -> Comparator.comparing(LearningResource::getTitle, String.CASE_INSENSITIVE_ORDER);
            case TITLE_DESC -> Comparator.comparing(LearningResource::getTitle, String.CASE_INSENSITIVE_ORDER).reversed();
            case RECENT -> Comparator.comparing(LearningResource::getUpdatedAt).reversed();
        };

        return base.stream()
                .filter(resource -> matchesQuery(resource, normalizedQuery))
                .filter(resource -> normalizedSubject == null || normalizedSubject.equals(normalizeForSearch(resource.getSubject())))
                .filter(resource -> normalizedLanguage == null || normalizedLanguage.equals(normalizeForSearch(resource.getLanguage())))
                .filter(resource -> normalizedTag == null || resource.getTags().stream()
                        .map(LearningResourceService::normalizeForSearch)
                        .anyMatch(normalizedTag::equals))
                .sorted(comparator)
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public LibraryFacets facets() {
        List<LearningResource> rows = resources.findByLibraryVisibleTrueOrderByUpdatedAtDesc();
        Set<String> subjects = new LinkedHashSet<>();
        Set<String> languages = new LinkedHashSet<>();
        Set<String> tags = new LinkedHashSet<>();
        rows.forEach(resource -> {
            if (resource.getSubject() != null) subjects.add(resource.getSubject());
            if (resource.getLanguage() != null) languages.add(resource.getLanguage());
            tags.addAll(resource.getTags());
        });
        return new LibraryFacets(
                sortCaseInsensitive(subjects),
                sortCaseInsensitive(tags),
                sortCaseInsensitive(languages)
        );
    }

    @Transactional(readOnly = true)
    public ResourceView getLibrary(UUID id) {
        LearningResource resource = requireResource(id);
        if (!resource.isLibraryVisible() && resource.getArchivedAt() == null) {
            throw new ResourceNotFoundException("Conteúdo da Biblioteca não encontrado.");
        }
        return view(resource);
    }

    @Transactional(readOnly = true)
    public ResourceView get(UUID id) {
        return view(requireResource(id));
    }

    @Transactional
    public ResourceView createLibrary(LibraryResourceInput input) {
        validateLibrary(input);
        LearningResource resource = new LearningResource(null, input.title().trim());
        applyLibraryInput(resource, input);
        resource.publishToLibrary();
        return view(resources.save(resource));
    }

    @Transactional
    public ResourceView createLibraryImported(ImportedLibraryResourceInput input) {
        if (input == null) throw new IllegalArgumentException("Material importado é obrigatório.");
        LibraryResourceInput resourceInput = new LibraryResourceInput(
                input.title(),
                input.summary(),
                input.body(),
                input.format(),
                input.sourceType(),
                input.sourceUrl(),
                input.sourceLabel(),
                input.subject(),
                input.tags(),
                input.language()
        );
        validateLibrary(resourceInput);
        LearningResource resource = new LearningResource(null, resourceInput.title().trim());
        CanonicalDocument canonical = applyLibraryInput(resource, resourceInput);
        resource.recordProvenance(
                clean(input.sourceReference()),
                input.sourceSnapshotAt() == null ? Instant.now() : input.sourceSnapshotAt(),
                clean(input.sourceContentSha256()) == null ? canonical.contentSha256() : clean(input.sourceContentSha256())
        );
        resource.publishToLibrary();
        return view(resources.save(resource));
    }

    @Transactional
    public ResourceView updateLibrary(UUID id, LibraryResourceInput input) {
        validateLibrary(input);
        LearningResource resource = requireResource(id);
        if (!resource.isLibraryVisible()) {
            throw new ResourceNotFoundException("Conteúdo da Biblioteca não encontrado.");
        }
        applyLibraryInput(resource, input);
        return view(resource);
    }

    @Transactional
    public void archiveLibrary(UUID id) {
        LearningResource resource = requireResource(id);
        if (!resource.isLibraryVisible()) {
            throw new ResourceNotFoundException("Conteúdo da Biblioteca não encontrado.");
        }
        liveStage.revokeForResource(resource.getId());
        resource.archiveFromLibrary();
    }

    @Transactional
    public ResourceView restoreLibrary(UUID id) {
        LearningResource resource = requireResource(id);
        if (resource.getArchivedAt() == null) {
            throw new ResourceNotFoundException("Conteúdo arquivado não encontrado.");
        }
        resource.publishToLibrary();
        return view(resource);
    }

    @Transactional
    public ResourceView create(ResourceInput input) {
        validate(input);
        Classroom classroom = requireClassroom(input.classroomId());
        LearningResource resource = new LearningResource(classroom, input.title().trim());
        applyResourceInput(resource, input);
        return view(resources.save(resource));
    }

    @Transactional
    public ResourceView update(UUID id, ResourceInput input) {
        validate(input);
        LearningResource resource = requireResource(id);
        if (resource.getClassroom() == null || !resource.getClassroom().getId().equals(input.classroomId())) {
            throw new IllegalArgumentException("O recurso não pode ser movido para outra turma.");
        }
        applyResourceInput(resource, input);
        return view(resource);
    }

    @Transactional
    public void delete(UUID id) {
        LearningResource resource = requireResource(id);
        if (resources.isReferencedByJourneyStage(id)) {
            throw new LearningResourceInUseException("O conteúdo está vinculado a uma jornada e não pode ser excluído.");
        }
        resources.delete(resource);
    }

    private CanonicalDocument applyLibraryInput(LearningResource resource, LibraryResourceInput input) {
        validateSemanticMetadata(input.subject(), input.tags(), input.language());
        CanonicalDocument canonical = canonicalizer.canonicalize(
                input.title().trim(),
                cleanBody(input.body()),
                input.format() == null ? resource.getFormat() : input.format(),
                clean(input.sourceUrl()),
                input.subject(),
                input.tags(),
                input.language()
        );
        resource.update(
                input.title().trim(),
                clean(input.summary()),
                canonical.body(),
                canonical.format(),
                input.sourceType() == null ? resource.getSourceType() : input.sourceType(),
                clean(input.sourceUrl()),
                clean(input.sourceLabel())
        );
        resource.updateSemanticMetadata(canonical.subject(), canonical.tags(), canonical.language());
        if (input.copyProtected() != null) resource.changeCopyProtection(input.copyProtected());
        recordDerived(resource, canonical);
        return canonical;
    }

    private CanonicalDocument applyResourceInput(LearningResource resource, ResourceInput input) {
        validateSemanticMetadata(input.subject(), input.tags(), input.language());
        CanonicalDocument canonical = canonicalizer.canonicalize(
                input.title().trim(),
                cleanBody(input.body()),
                input.format() == null ? resource.getFormat() : input.format(),
                clean(input.sourceUrl()),
                input.subject(),
                input.tags(),
                input.language()
        );
        resource.update(
                input.title().trim(),
                clean(input.summary()),
                canonical.body(),
                canonical.format(),
                input.sourceType() == null ? resource.getSourceType() : input.sourceType(),
                clean(input.sourceUrl()),
                clean(input.sourceLabel())
        );
        resource.updateSemanticMetadata(canonical.subject(), canonical.tags(), canonical.language());
        recordDerived(resource, canonical);
        return canonical;
    }

    private void recordDerived(LearningResource resource, CanonicalDocument canonical) {
        try {
            resource.recordDerivedStructure(
                    canonical.contentSha256(),
                    objectMapper.writeValueAsString(canonical.sections()),
                    canonical.parserVersion()
            );
        } catch (Exception error) {
            throw new IllegalStateException("Não foi possível registrar a estrutura derivada do conteúdo.", error);
        }
    }

    private void validateLibrary(LibraryResourceInput input) {
        if (input == null || input.title() == null || input.title().isBlank()) {
            throw new IllegalArgumentException("Título do conteúdo é obrigatório.");
        }
        if (input.format() == LearningResourceFormat.LINK
                && (input.sourceUrl() == null || input.sourceUrl().isBlank())) {
            throw new IllegalArgumentException("Recurso do tipo link precisa de URL.");
        }
    }

    private void validate(ResourceInput input) {
        if (input == null || input.classroomId() == null) {
            throw new IllegalArgumentException("Turma é obrigatória.");
        }
        if (input.title() == null || input.title().isBlank()) {
            throw new IllegalArgumentException("Título do conteúdo é obrigatório.");
        }
        if (input.format() == LearningResourceFormat.LINK
                && (input.sourceUrl() == null || input.sourceUrl().isBlank())) {
            throw new IllegalArgumentException("Recurso do tipo link precisa de URL.");
        }
    }

    private void validateSemanticMetadata(String subject, List<String> tags, String language) {
        if (clean(subject) != null && clean(subject).length() > 160) {
            throw new IllegalArgumentException("Assunto deve ter no máximo 160 caracteres.");
        }
        if (clean(language) != null && clean(language).length() > 20) {
            throw new IllegalArgumentException("Idioma deve ter no máximo 20 caracteres.");
        }
        if (tags != null && tags.size() > 20) {
            throw new IllegalArgumentException("Use no máximo 20 tags por material.");
        }
    }

    private Classroom requireClassroom(UUID id) {
        return classrooms.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
    }

    private LearningResource requireResource(UUID id) {
        return resources.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conteúdo não encontrado."));
    }

    private ResourceView view(LearningResource resource) {
        return new ResourceView(
                resource.getId(),
                resource.getClassroom() == null ? null : resource.getClassroom().getId(),
                resource.getTitle(),
                resource.getSummary(),
                resource.getBody(),
                resource.getFormat(),
                resource.getSourceType(),
                resource.getSourceUrl(),
                resource.getSourceLabel(),
                resource.getSourceReference(),
                resource.getSourceSnapshotAt(),
                resource.getSourceContentSha256(),
                resource.getSubject(),
                resource.getTags(),
                resource.getLanguage(),
                resource.getContentSha256(),
                resource.getOutlineParserVersion(),
                outline(resource),
                resource.isLibraryVisible(),
                resource.isCopyProtected(),
                resource.getRevision(),
                resource.getArchivedAt(),
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    private List<CanonicalDocument.Section> outline(LearningResource resource) {
        String json = resource.getOutlineJson();
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<CanonicalDocument.Section>>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static boolean matchesQuery(LearningResource resource, String query) {
        if (query == null) return true;
        if (contains(resource.getTitle(), query)
                || contains(resource.getSummary(), query)
                || contains(resource.getSubject(), query)) {
            return true;
        }
        return resource.getTags().stream().anyMatch(value -> contains(value, query));
    }

    private static boolean contains(String value, String query) {
        return value != null && normalizeForSearch(value).contains(query);
    }

    private static String normalizeForSearch(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private static List<String> sortCaseInsensitive(Set<String> values) {
        List<String> sorted = new ArrayList<>(values);
        sorted.sort(String.CASE_INSENSITIVE_ORDER);
        return List.copyOf(sorted);
    }

    private static String cleanBody(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public enum LibrarySort {
        RECENT,
        TITLE_ASC,
        TITLE_DESC
    }

    public record ResourceInput(
            UUID classroomId,
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String subject,
            List<String> tags,
            String language
    ) {}

    /** copyProtected null keeps the current value on update and means off on create. */
    public record LibraryResourceInput(
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String subject,
            List<String> tags,
            String language,
            Boolean copyProtected
    ) {
        public LibraryResourceInput(String title, String summary, String body, LearningResourceFormat format,
                                    LearningResourceSourceType sourceType, String sourceUrl, String sourceLabel,
                                    String subject, List<String> tags, String language) {
            this(title, summary, body, format, sourceType, sourceUrl, sourceLabel, subject, tags, language, null);
        }
    }

    public record ImportedLibraryResourceInput(
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String sourceReference,
            Instant sourceSnapshotAt,
            String sourceContentSha256,
            String subject,
            List<String> tags,
            String language
    ) {}

    public record ResourceView(
            UUID id,
            UUID classroomId,
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String sourceReference,
            Instant sourceSnapshotAt,
            String sourceContentSha256,
            String subject,
            List<String> tags,
            String language,
            String contentSha256,
            String outlineParserVersion,
            List<CanonicalDocument.Section> outline,
            boolean libraryVisible,
            boolean copyProtected,
            int revision,
            Instant archivedAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record LibraryFacets(
            List<String> subjects,
            List<String> tags,
            List<String> languages
    ) {}
}
