package br.com.arenadev.study;

import br.com.arenadev.achievement.AchievementService;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.content.LearningResource;
import br.com.arenadev.journey.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service
public class JourneyStudyService {
    private final JourneyRepository journeys;
    private final EnrollmentRepository enrollments;
    private final JourneyStageProgressRepository progress;
    private final StudyAccessPolicy accessPolicy;
    private final StudentJourneyAccessRepository redeemedAccess;
    private final StudentJourneyStageProgressRepository redeemedProgress;
    private final AchievementService achievements;

    public JourneyStudyService(
            JourneyRepository journeys,
            EnrollmentRepository enrollments,
            JourneyStageProgressRepository progress,
            StudyAccessPolicy accessPolicy,
            StudentJourneyAccessRepository redeemedAccess,
            StudentJourneyStageProgressRepository redeemedProgress,
            AchievementService achievements
    ) {
        this.journeys = journeys;
        this.enrollments = enrollments;
        this.progress = progress;
        this.accessPolicy = accessPolicy;
        this.redeemedAccess = redeemedAccess;
        this.redeemedProgress = redeemedProgress;
        this.achievements = achievements;
    }

    @Transactional(readOnly = true)
    public List<JourneyStudySummary> list(StudyPrincipal principal) {
        requirePrincipalEnrollment(principal);
        Map<UUID, JourneyStudySummary> available = new LinkedHashMap<>();
        enrollments.findByStudentIdAndActiveTrue(principal.userId()).stream()
                .filter(accessPolicy::canAccessClassroomStudy)
                .forEach(enrollment -> journeys.findByClassroomIdAndStatusOrderByUpdatedAtDesc(enrollment.getClassroom().getId(), JourneyStatus.PUBLISHED)
                        .forEach(journey -> available.put(journey.getId(), summary(journey, AccessContext.enrollment(enrollment)))));
        redeemedAccess.findByStudentIdOrderByRedeemedAtDesc(principal.userId()).stream()
                .filter(access -> access.getJourney().getStatus() == JourneyStatus.PUBLISHED)
                .forEach(access -> available.putIfAbsent(access.getJourney().getId(), summary(access.getJourney(), AccessContext.redeemed(access))));
        return available.values().stream()
                .sorted(Comparator.comparing(JourneyStudySummary::started).reversed()
                        .thenComparing(JourneyStudySummary::lastStudiedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public JourneyStudyView get(UUID journeyId, StudyPrincipal principal) {
        Journey journey = requireJourney(journeyId);
        AccessContext access = requireAccess(journey, principal);
        Projection projection = project(journey, access);
        return new JourneyStudyView(
                journey.getId(), journey.getTitle(), journey.getDescription(),
                projection.progress(), modules(journey, projection.states()), List.of(), journey.getReleasedChapterCount()
        );
    }


    @Transactional(readOnly = true)
    public JourneyStudyView preview(UUID journeyId) {
        Journey journey = requireJourney(journeyId);
        return previewView(journey);
    }

    @Transactional(readOnly = true)
    public JourneyContentDetailView previewContent(UUID journeyId, UUID contentId) {
        Journey journey = requireJourney(journeyId);
        JourneyStage stage = requireContent(journey, contentId);
        return detail(stage, StudyState.CURRENT);
    }

    @Transactional(readOnly = true)
    public JourneyContentDetailView content(UUID journeyId, UUID contentId, StudyPrincipal principal) {
        Journey journey = requireJourney(journeyId);
        AccessContext access = requireAccess(journey, principal);
        JourneyStage stage = requireContent(journey, contentId);
        StudyState state = project(journey, access).states().get(stage.getId());
        if (state == StudyState.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este conteúdo ainda está bloqueado.");
        }
        return detail(stage, state);
    }

    @Transactional
    public JourneyStudyView start(UUID journeyId, UUID contentId, StudyPrincipal principal) {
        Journey journey = requireJourney(journeyId);
        AccessContext access = requireAccess(journey, principal);
        JourneyStage stage = requireContent(journey, contentId);
        StudyState state = project(journey, access).states().get(stage.getId());
        if (state == StudyState.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este conteúdo ainda está bloqueado.");
        }
        if (state != StudyState.COMPLETED) {
            saveStart(stage, access);
        }
        return view(journey, access);
    }

    @Transactional
    public JourneyStudyView complete(UUID journeyId, UUID contentId, StudyPrincipal principal) {
        Journey journey = requireJourney(journeyId);
        AccessContext access = requireAccess(journey, principal);
        JourneyStage stage = requireContent(journey, contentId);
        StudyState state = project(journey, access).states().get(stage.getId());
        if (state == StudyState.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este conteúdo ainda está bloqueado.");
        }
        saveComplete(stage, access);
        List<AchievementService.AchievementView> unlocked = achievements.evaluate(principal.userId());
        return view(journey, access, unlocked);
    }


    private JourneyStudyView previewView(Journey journey) {
        Map<UUID, StudyState> states = new LinkedHashMap<>();
        journey.getStages().forEach(stage -> states.put(stage.getId(), StudyState.CURRENT));
        return new JourneyStudyView(journey.getId(), journey.getTitle(), journey.getDescription(),
                new JourneyProgressSummary(0, journey.getStages().size(), 0), modules(journey, states), List.of(), journey.getReleasedChapterCount());
    }

    private JourneyStudyView view(Journey journey, AccessContext access) {
        return view(journey, access, List.of());
    }

    private JourneyStudyView view(Journey journey, AccessContext access, List<AchievementService.AchievementView> unlocked) {
        Projection projection = project(journey, access);
        return new JourneyStudyView(journey.getId(), journey.getTitle(), journey.getDescription(),
                projection.progress(), modules(journey, projection.states()), unlocked, journey.getReleasedChapterCount());
    }

    private JourneyStudySummary summary(Journey journey, AccessContext access) {
        Projection projection = project(journey, access);
        JourneyStage current = journey.getStages().stream()
                .filter(stage -> projection.states().get(stage.getId()) == StudyState.CURRENT)
                .findFirst().orElse(null);
        return new JourneyStudySummary(
                journey.getId(), journey.getTitle(), journey.getDescription(), projection.progress(),
                current == null ? null : current.getId(), current == null ? null : current.getTitle(),
                projection.started(), projection.lastStudiedAt(),
                journey.getClassroom().getId(), journey.getClassroom().getName(), journey.getClassroom().getCode()
        );
    }

    private Projection project(Journey journey, AccessContext access) {
        Map<UUID, ProgressState> persisted = new HashMap<>();
        if (access.enrollment() != null) {
            progress.findByStageJourneyIdAndEnrollmentId(journey.getId(), access.enrollment().getId())
                    .forEach(item -> persisted.put(item.getStage().getId(), new ProgressState(item.getCompletedAt(), item.getUpdatedAt())));
        } else {
            redeemedProgress.findByStageJourneyIdAndAccessId(journey.getId(), access.redeemed().getId())
                    .forEach(item -> persisted.put(item.getStage().getId(), new ProgressState(item.getCompletedAt(), item.getUpdatedAt())));
        }
        Map<UUID, StudyState> states = new LinkedHashMap<>(); boolean currentAssigned = false; int completed = 0;
        Integer released = journey.getReleasedChapterCount();
        Map<JourneySection, Integer> chapterPositions = new LinkedHashMap<>();
        for (JourneyStage stage : journey.getStages()) {
            int chapterIndex = chapterPositions.computeIfAbsent(stage.getSection(), ignored -> chapterPositions.size());
            ProgressState item = persisted.get(stage.getId());
            boolean done = item != null && item.completedAt() != null;
            if (done) completed++;
            // A teacher gate overrides the legacy completion sequence only inside
            // the explicitly released prefix. Prior completed progress remains recorded.
            StudyState state;
            if (released != null) {
                if (chapterIndex >= released) state = StudyState.LOCKED;
                else if (done) state = StudyState.COMPLETED;
                else if (!currentAssigned) { state = StudyState.CURRENT; currentAssigned = true; }
                else state = StudyState.AVAILABLE;
            } else if (done) {
                state = StudyState.COMPLETED;
            } else if (!currentAssigned) {
                state = StudyState.CURRENT;
                currentAssigned = true;
            } else {
                state = StudyState.LOCKED;
            }
            states.put(stage.getId(), state);
        }
        int total = journey.getStages().size(); int percent = total == 0 ? 0 : Math.round(completed * 100f / total);
        Instant lastStudiedAt = persisted.values().stream().map(ProgressState::updatedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        return new Projection(states, new JourneyProgressSummary(completed, total, percent), !persisted.isEmpty(), lastStudiedAt);
    }

    private AccessContext requireAccess(Journey journey, StudyPrincipal principal) {
        if (journey.getStatus() != JourneyStatus.PUBLISHED) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Jornada não encontrada.");
        Optional<Enrollment> enrollment = enrollments.findByStudentIdAndClassroomIdAndActiveTrue(principal.userId(), journey.getClassroom().getId());
        if (enrollment.filter(accessPolicy::canAccessClassroomStudy).isPresent()) return AccessContext.enrollment(enrollment.get());
        return redeemedAccess.findByStudentIdAndJourneyId(principal.userId(), journey.getId())
                .map(AccessContext::redeemed)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Jornada não encontrada."));
    }

    private void saveStart(JourneyStage stage, AccessContext access) {
        if (access.enrollment() != null) {
            JourneyStageProgress entity = progress.findByStageIdAndEnrollmentId(stage.getId(), access.enrollment().getId()).orElseGet(() -> new JourneyStageProgress(stage, access.enrollment()));
            entity.start(Instant.now()); progress.save(entity);
        } else {
            StudentJourneyStageProgress entity = redeemedProgress.findByStageIdAndAccessId(stage.getId(), access.redeemed().getId()).orElseGet(() -> new StudentJourneyStageProgress(stage, access.redeemed()));
            entity.start(Instant.now()); redeemedProgress.save(entity);
        }
    }

    private void saveComplete(JourneyStage stage, AccessContext access) {
        if (access.enrollment() != null) {
            JourneyStageProgress entity = progress.findByStageIdAndEnrollmentId(stage.getId(), access.enrollment().getId()).orElseGet(() -> new JourneyStageProgress(stage, access.enrollment()));
            entity.complete(Instant.now()); progress.save(entity);
        } else {
            StudentJourneyStageProgress entity = redeemedProgress.findByStageIdAndAccessId(stage.getId(), access.redeemed().getId()).orElseGet(() -> new StudentJourneyStageProgress(stage, access.redeemed()));
            entity.complete(Instant.now()); redeemedProgress.save(entity);
        }
    }

    private List<JourneyModuleView> modules(Journey journey, Map<UUID, StudyState> states) {
        Map<String, ModuleBuilder> modules = new LinkedHashMap<>();
        for (JourneyStage stage : journey.getStages()) {
            JourneySection section = stage.getSection();
            String key = section == null ? "__default" : section.getId().toString();
            ModuleBuilder module = modules.computeIfAbsent(key, ignored -> new ModuleBuilder(
                    section == null ? null : section.getId(),
                    section == null ? "Conteúdo" : section.getTitle(),
                    section == null ? null : section.getDescription(),
                    new ArrayList<>()
            ));
            module.contents().add(contentView(stage, states.get(stage.getId())));
        }
        return modules.values().stream()
                .map(module -> new JourneyModuleView(module.id(), module.title(), module.description(), List.copyOf(module.contents())))
                .toList();
    }

    private JourneyContentView contentView(JourneyStage stage, StudyState state) {
        LearningResource resource = stage.getLearningResource();
        boolean hasSnapshot = stage.getResourceSnapshotFormat() != null;
        boolean hasExternalSource = hasSnapshot
                ? stage.getResourceSnapshotSourceUrl() != null || stage.getResourceSnapshotSourceLabel() != null
                : resource != null && (resource.getSourceUrl() != null || resource.getSourceLabel() != null);
        return new JourneyContentView(stage.getId(), stage.getTitle(), stage.getDescription(), state,
                resource == null ? null : resource.getId(), hasExternalSource);
    }

    private JourneyContentDetailView detail(JourneyStage stage, StudyState state) {
        LearningResource resource = stage.getLearningResource();
        return new JourneyContentDetailView(
                stage.getId(), stage.getTitle(), stage.getDescription(), state,
                resource == null ? null : resource.getId(),
                stage.getResourceSnapshotFormat() != null ? stage.getResourceSnapshotBody() : resource == null ? null : resource.getBody(),
                stage.getResourceSnapshotFormat() != null ? stage.getResourceSnapshotFormat() : resource == null ? null : resource.getFormat().name(),
                stage.getResourceSnapshotFormat() != null ? stage.getResourceSnapshotSourceUrl() : resource == null ? null : resource.getSourceUrl(),
                stage.getResourceSnapshotFormat() != null ? stage.getResourceSnapshotSourceLabel() : resource == null ? null : resource.getSourceLabel(),
                stage.getJourney().isCopyProtected() || (resource != null && resource.isCopyProtected())
        );
    }

    private Enrollment requirePrincipalEnrollment(StudyPrincipal principal) {
        Enrollment enrollment = enrollments.findById(principal.enrollmentId())
                .filter(Enrollment::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Matrícula ativa não encontrada."));
        if (!enrollment.getClassroom().getId().equals(principal.classroomId())
                || !enrollment.getStudent().getId().equals(principal.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A identidade de estudo não pertence a esta matrícula.");
        }
        return enrollment;
    }


    private Journey requireJourney(UUID journeyId) {
        return journeys.findById(journeyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Jornada não encontrada."));
    }

    private JourneyStage requireContent(Journey journey, UUID contentId) {
        return journey.getStages().stream().filter(stage -> stage.getId().equals(contentId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conteúdo não encontrado nesta jornada."));
    }

    public enum StudyState { COMPLETED, CURRENT, AVAILABLE, LOCKED }
    public record JourneyProgressSummary(int completedContents, int totalContents, int percent) {}
    public record JourneyStudySummary(UUID id, String title, String description, JourneyProgressSummary progress, UUID currentContentId, String currentContentTitle, boolean started, Instant lastStudiedAt, UUID classroomId, String classroomName, String classroomCode) {}
    public record JourneyStudyView(UUID id, String title, String description, JourneyProgressSummary progress, List<JourneyModuleView> modules, List<AchievementService.AchievementView> newlyUnlockedAchievements, Integer releasedChapterCount) {}
    public record JourneyModuleView(UUID id, String title, String description, List<JourneyContentView> contents) {}
    public record JourneyContentView(UUID id, String title, String description, StudyState state, UUID resourceId, boolean hasExternalSource) {}
    /** copyProtected: the Journey or the linked material forbids copying in the reader. */
    public record JourneyContentDetailView(UUID id, String title, String description, StudyState state, UUID resourceId, String body, String format, String sourceUrl, String sourceLabel, boolean copyProtected) {}
    private record Projection(Map<UUID, StudyState> states, JourneyProgressSummary progress, boolean started, Instant lastStudiedAt) {}
    private record ProgressState(Instant completedAt, Instant updatedAt) {}
    private record AccessContext(Enrollment enrollment, StudentJourneyAccess redeemed) {
        static AccessContext enrollment(Enrollment value) { return new AccessContext(value, null); }
        static AccessContext redeemed(StudentJourneyAccess value) { return new AccessContext(null, value); }
    }
    private record ModuleBuilder(UUID id, String title, String description, List<JourneyContentView> contents) {}
}
