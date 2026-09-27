package br.com.arenadev.content;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class LearningResourceService {
    private final LearningResourceRepository resources;
    private final ClassroomRepository classrooms;

    public LearningResourceService(
            LearningResourceRepository resources,
            ClassroomRepository classrooms
    ) {
        this.resources = resources;
        this.classrooms = classrooms;
    }

    @Transactional(readOnly = true)
    public List<ResourceView> list(UUID classroomId) {
        requireClassroom(classroomId);
        return resources.findByClassroomIdOrderByUpdatedAtDesc(classroomId)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public ResourceView create(ResourceInput input) {
        validate(input);
        Classroom classroom = requireClassroom(input.classroomId());
        LearningResource resource = new LearningResource(classroom, input.title().trim());
        resource.update(
                input.title().trim(),
                clean(input.summary()),
                clean(input.body()),
                input.format() == null ? LearningResourceFormat.MARKDOWN : input.format(),
                input.sourceType() == null ? LearningResourceSourceType.MANUAL : input.sourceType(),
                clean(input.sourceUrl()),
                clean(input.sourceLabel())
        );
        return view(resources.save(resource));
    }

    @Transactional
    public ResourceView update(UUID id, ResourceInput input) {
        validate(input);
        LearningResource resource = requireResource(id);
        if (!resource.getClassroom().getId().equals(input.classroomId())) {
            throw new IllegalArgumentException("O recurso não pode ser movido para outra turma.");
        }
        resource.update(
                input.title().trim(),
                clean(input.summary()),
                clean(input.body()),
                input.format() == null ? resource.getFormat() : input.format(),
                input.sourceType() == null ? resource.getSourceType() : input.sourceType(),
                clean(input.sourceUrl()),
                clean(input.sourceLabel())
        );
        return view(resource);
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
                resource.getClassroom().getId(),
                resource.getTitle(),
                resource.getSummary(),
                resource.getBody(),
                resource.getFormat(),
                resource.getSourceType(),
                resource.getSourceUrl(),
                resource.getSourceLabel(),
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
    public record ResourceInput(
            UUID classroomId,
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel
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
            Instant createdAt,
            Instant updatedAt
    ) {}
}
