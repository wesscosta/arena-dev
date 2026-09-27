package br.com.arenadev.content.ingestion;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.content.*;
import br.com.arenadev.journey.*;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class JourneyDraftMaterializationService {
    private final ClassroomRepository classrooms;
    private final LearningResourceRepository resources;
    private final JourneyRepository journeys;
    private final JourneyService journeyService;

    public JourneyDraftMaterializationService(
            ClassroomRepository classrooms,
            LearningResourceRepository resources,
            JourneyRepository journeys,
            JourneyService journeyService
    ) {
        this.classrooms = classrooms;
        this.resources = resources;
        this.journeys = journeys;
        this.journeyService = journeyService;
    }

    @Transactional
    public JourneyService.JourneyView materialize(MaterializeRequest request) {
        if (request == null || request.classroomId() == null || request.draft() == null) {
            throw new IllegalArgumentException("Turma e rascunho são obrigatórios.");
        }
        Classroom classroom = classrooms.findById(request.classroomId())
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
        ContentIngestionService.DraftView draft = request.draft();
        if (draft.title() == null || draft.title().isBlank()) {
            throw new IllegalArgumentException("O rascunho precisa de título.");
        }

        Journey journey = new Journey(classroom, draft.title().trim());
        journey.update(draft.title().trim(), clean(draft.description()));
        int globalPosition = 0;
        for (int sectionPosition = 0; sectionPosition < draft.sections().size(); sectionPosition++) {
            ContentIngestionService.DraftSection draftSection = draft.sections().get(sectionPosition);
            JourneySection section = new JourneySection(
                    valueOr(draftSection.title(), "Módulo " + (sectionPosition + 1)),
                    clean(draftSection.description()),
                    sectionPosition
            );
            journey.addSection(section);

            for (ContentIngestionService.DraftItem draftItem : draftSection.items()) {
                if (draftItem == null || draftItem.title() == null || draftItem.title().isBlank()) continue;

                LearningResource resource = createResourceIfNeeded(classroom, draft, draftItem);
                JourneyStage stage = new JourneyStage(draftItem.title().trim(), globalPosition);
                JourneyUnlockRule unlock = globalPosition == 0
                        ? JourneyUnlockRule.IMMEDIATE
                        : JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED;
                stage.update(
                        draftItem.title().trim(),
                        clean(draftItem.description()),
                        globalPosition,
                        null,
                        unlock,
                        JourneyCompletionRule.MANUAL,
                        section,
                        mapItemType(draftItem.type()),
                        resource
                );
                journey.addStage(stage);
                globalPosition++;
            }
        }

        if (journey.getStages().isEmpty()) {
            throw new IllegalArgumentException("O rascunho precisa ter ao menos um item.");
        }

        Journey saved = journeys.saveAndFlush(journey);
        return journeyService.get(saved.getId());
    }

    private LearningResource createResourceIfNeeded(
            Classroom classroom,
            ContentIngestionService.DraftView draft,
            ContentIngestionService.DraftItem item
    ) {
        String body = clean(item.body());
        String sourceUrl = clean(item.sourceUrl());
        boolean contentLike = item.type() == DraftItemType.CONTENT
                || item.type() == DraftItemType.EXTERNAL_RESOURCE
                || body != null
                || sourceUrl != null;
        if (!contentLike) return null;

        LearningResource resource = new LearningResource(classroom, item.title().trim());
        LearningResourceFormat format = sourceUrl != null && body == null
                ? LearningResourceFormat.LINK
                : draft.source() == ContentIngestionSource.TEXT || draft.source() == ContentIngestionSource.FILE
                    ? LearningResourceFormat.PLAIN_TEXT
                    : LearningResourceFormat.MARKDOWN;
        resource.update(
                item.title().trim(),
                clean(item.description()),
                body,
                format,
                mapSourceType(draft.source()),
                sourceUrl,
                clean(draft.sourceLabel())
        );
        return resources.save(resource);
    }

    private LearningResourceSourceType mapSourceType(ContentIngestionSource source) {
        if (source == null) return LearningResourceSourceType.MANUAL;
        return switch (source) {
            case AI -> LearningResourceSourceType.AI;
            case TEMPLATE -> LearningResourceSourceType.TEMPLATE;
            case TEXT -> LearningResourceSourceType.TEXT;
            case MARKDOWN -> LearningResourceSourceType.MARKDOWN;
            case FILE -> LearningResourceSourceType.FILE;
            case URL -> LearningResourceSourceType.URL;
            case NOTION -> LearningResourceSourceType.NOTION;
        };
    }

    private JourneyItemType mapItemType(DraftItemType type) {
        if (type == null) return JourneyItemType.CONTENT;
        return JourneyItemType.valueOf(type.name());
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String valueOr(String value, String fallback) {
        String cleaned = clean(value);
        return cleaned == null ? fallback : cleaned;
    }

    public record MaterializeRequest(
            UUID classroomId,
            ContentIngestionService.DraftView draft
    ) {}
}
