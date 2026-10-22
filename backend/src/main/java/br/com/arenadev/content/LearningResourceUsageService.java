package br.com.arenadev.content;

import br.com.arenadev.journey.Journey;
import br.com.arenadev.journey.JourneyRepository;
import br.com.arenadev.journey.JourneyStage;
import br.com.arenadev.journey.JourneyStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LearningResourceUsageService {
    private final LearningResourceRepository resources;
    private final JourneyRepository journeys;

    public LearningResourceUsageService(
            LearningResourceRepository resources,
            JourneyRepository journeys
    ) {
        this.resources = resources;
        this.journeys = journeys;
    }

    @Transactional(readOnly = true)
    public ResourceUsageView usage(UUID resourceId) {
        LearningResource resource = resources.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Conteúdo não encontrado."));

        List<JourneyUsage> usages = new ArrayList<>();
        for (Journey journey : journeys.findByLearningResourceId(resourceId)) {
            for (JourneyStage stage : journey.getStages()) {
                if (stage.getLearningResource() == null
                        || !stage.getLearningResource().getId().equals(resourceId)) {
                    continue;
                }
                Integer snapshotRevision = stage.getResourceSnapshotRevision();
                boolean updateAvailable = snapshotRevision != null
                        && resource.getRevision() > snapshotRevision;
                usages.add(new JourneyUsage(
                        journey.getId(),
                        journey.getTitle(),
                        journey.getStatus(),
                        journey.getClassroom().getId(),
                        journey.getClassroom().getName(),
                        stage.getId(),
                        stage.getTitle(),
                        snapshotRevision,
                        resource.getRevision(),
                        updateAvailable,
                        updateAvailable && journey.getStatus() != JourneyStatus.ARCHIVED
                ));
            }
        }

        return new ResourceUsageView(resource.getId(), resource.getRevision(), List.copyOf(usages));
    }

    public record ResourceUsageView(
            UUID resourceId,
            int currentRevision,
            List<JourneyUsage> journeys
    ) {}

    public record JourneyUsage(
            UUID journeyId,
            String journeyTitle,
            JourneyStatus journeyStatus,
            UUID classroomId,
            String classroomName,
            UUID stageId,
            String stageTitle,
            Integer snapshotRevision,
            int currentRevision,
            boolean updateAvailable,
            boolean refreshAllowed
    ) {}
}
