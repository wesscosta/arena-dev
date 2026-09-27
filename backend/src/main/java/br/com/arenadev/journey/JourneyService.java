package br.com.arenadev.journey;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import br.com.arenadev.submission.ActivitySubmissionRepository;
import br.com.arenadev.submission.ActivitySubmissionStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class JourneyService {
    private final JourneyRepository journeyRepository;
    private final ClassroomRepository classroomRepository;
    private final ActivityRepository activityRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final JourneyStageProgressRepository progressRepository;
    private final ActivitySubmissionRepository submissionRepository;

    public JourneyService(
            JourneyRepository journeyRepository,
            ClassroomRepository classroomRepository,
            ActivityRepository activityRepository,
            EnrollmentRepository enrollmentRepository,
            JourneyStageProgressRepository progressRepository,
            ActivitySubmissionRepository submissionRepository
    ) {
        this.journeyRepository = journeyRepository;
        this.classroomRepository = classroomRepository;
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.progressRepository = progressRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional(readOnly = true)
    public List<JourneyView> list(UUID classroomId) {
        requireClassroom(classroomId);
        return journeyRepository.findByClassroomIdOrderByUpdatedAtDesc(classroomId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public JourneyView get(UUID id) { return toView(requireJourney(id)); }

    @Transactional
    public JourneyView create(JourneyInput input) {
        validateInput(input);
        Classroom classroom = requireClassroom(input.classroomId());
        Journey journey = new Journey(classroom, input.title().trim());
        journey.update(input.title().trim(), clean(input.description()));
        applyStages(journey, input.stages());
        return toView(journeyRepository.save(journey));
    }

    @Transactional
    public JourneyView update(UUID id, JourneyInput input) {
        validateInput(input);
        Journey journey = requireJourney(id);
        if (!journey.getClassroom().getId().equals(input.classroomId())) {
            throw new IllegalArgumentException("A jornada não pode ser movida para outra turma.");
        }
        journey.update(input.title().trim(), clean(input.description()));
        if (journey.getStatus() == JourneyStatus.DRAFT) {
            applyStages(journey, input.stages());
        } else if (input.stages() != null && !sameStageShape(journey, input.stages())) {
            throw new IllegalStateException("Etapas de uma jornada publicada não podem ser reestruturadas. Arquive e crie uma nova jornada.");
        }
        return toView(journey);
    }

    @Transactional
    public JourneyView publish(UUID id) {
        Journey journey = requireJourney(id);
        validatePublishable(journey);
        journey.publish();
        return toView(journey);
    }

    @Transactional
    public JourneyView archive(UUID id) {
        Journey journey = requireJourney(id);
        journey.archive();
        return toView(journey);
    }

    @Transactional(readOnly = true)
    public JourneyProgressView progress(UUID journeyId, UUID enrollmentId) {
        Journey journey = requireJourney(journeyId);
        Enrollment enrollment = requireEnrollment(enrollmentId);
        requireSameClassroom(journey, enrollment);
        if (journey.getStatus() == JourneyStatus.DRAFT) {
            throw new IllegalStateException("A jornada ainda não foi publicada.");
        }
        return buildProgress(journey, enrollment);
    }

    @Transactional(readOnly = true)
    public List<ParticipantJourneyView> publishedForEnrollment(UUID classroomId, UUID enrollmentId) {
        Enrollment enrollment = requireEnrollment(enrollmentId);
        if (!enrollment.isActive() || !enrollment.getClassroom().getId().equals(classroomId)) {
            throw new IllegalArgumentException("A matrícula não pertence à turma informada.");
        }
        return journeyRepository.findByClassroomIdAndStatusOrderByUpdatedAtDesc(classroomId, JourneyStatus.PUBLISHED).stream()
                .map(journey -> {
                    JourneyProgressView progress = buildProgress(journey, enrollment);
                    StageProgressView current = progress.stages().stream()
                            .filter(stage -> stage.status() == JourneyStageProgressStatus.IN_PROGRESS
                                    || stage.status() == JourneyStageProgressStatus.AVAILABLE)
                            .findFirst()
                            .orElse(null);
                    return new ParticipantJourneyView(
                            journey.getId(), journey.getTitle(), journey.getDescription(), progress.percent(),
                            progress.completedStages(), progress.totalStages(), current, progress.stages()
                    );
                })
                .toList();
    }

    @Transactional
    public JourneyProgressView startStage(UUID journeyId, UUID stageId, UUID enrollmentId) {
        Journey journey = requireJourney(journeyId);
        Enrollment enrollment = requireEnrollment(enrollmentId);
        requireSameClassroom(journey, enrollment);
        JourneyStage stage = requireStage(journey, stageId);
        JourneyProgressView current = buildProgress(journey, enrollment);
        StageProgressView state = current.stages().stream().filter(item -> item.stageId().equals(stageId)).findFirst().orElseThrow();
        if (state.status() == JourneyStageProgressStatus.LOCKED) throw new IllegalStateException("A etapa ainda está bloqueada.");
        if (state.status() != JourneyStageProgressStatus.COMPLETED) {
            JourneyStageProgress progress = progressRepository.findByStageIdAndEnrollmentId(stageId, enrollmentId)
                    .orElseGet(() -> new JourneyStageProgress(stage, enrollment));
            progress.start(Instant.now());
            progressRepository.save(progress);
        }
        return buildProgress(journey, enrollment);
    }

    @Transactional
    public JourneyProgressView completeStage(UUID journeyId, UUID stageId, UUID enrollmentId) {
        Journey journey = requireJourney(journeyId);
        Enrollment enrollment = requireEnrollment(enrollmentId);
        requireSameClassroom(journey, enrollment);
        JourneyStage stage = requireStage(journey, stageId);
        if (stage.getCompletionRule() != JourneyCompletionRule.MANUAL) {
            throw new IllegalStateException("Esta etapa é concluída automaticamente pelo critério configurado.");
        }
        JourneyProgressView current = buildProgress(journey, enrollment);
        StageProgressView state = current.stages().stream().filter(item -> item.stageId().equals(stageId)).findFirst().orElseThrow();
        if (state.status() == JourneyStageProgressStatus.LOCKED) throw new IllegalStateException("A etapa ainda está bloqueada.");
        JourneyStageProgress progress = progressRepository.findByStageIdAndEnrollmentId(stageId, enrollmentId)
                .orElseGet(() -> new JourneyStageProgress(stage, enrollment));
        progress.complete(Instant.now());
        progressRepository.save(progress);
        return buildProgress(journey, enrollment);
    }

    private JourneyProgressView buildProgress(Journey journey, Enrollment enrollment) {
        Map<UUID, JourneyStageProgress> persisted = new HashMap<>();
        progressRepository.findByStageJourneyIdAndEnrollmentId(journey.getId(), enrollment.getId())
                .forEach(item -> persisted.put(item.getStage().getId(), item));

        List<StageProgressView> result = new ArrayList<>();
        boolean previousCompleted = true;
        int completedCount = 0;
        for (int index = 0; index < journey.getStages().size(); index++) {
            JourneyStage stage = journey.getStages().get(index);
            JourneyStageProgress stored = persisted.get(stage.getId());
            boolean completed = isCompleted(stage, enrollment, stored);
            boolean unlocked = index == 0 || stage.getUnlockRule() == JourneyUnlockRule.IMMEDIATE || previousCompleted;
            JourneyStageProgressStatus status = completed
                    ? JourneyStageProgressStatus.COMPLETED
                    : !unlocked
                        ? JourneyStageProgressStatus.LOCKED
                        : stored != null && stored.getStartedAt() != null
                            ? JourneyStageProgressStatus.IN_PROGRESS
                            : JourneyStageProgressStatus.AVAILABLE;
            if (completed) completedCount++;
            result.add(new StageProgressView(
                    stage.getId(), stage.getPosition(), stage.getTitle(), stage.getDescription(),
                    stage.getActivity() == null ? null : stage.getActivity().getId(),
                    stage.getUnlockRule(), stage.getCompletionRule(), status,
                    stored == null ? null : stored.getStartedAt(),
                    completed ? completionTimestamp(stage, enrollment, stored) : null,
                    nextAction(stage, status)
            ));
            previousCompleted = completed;
        }
        int total = result.size();
        int percent = total == 0 ? 0 : Math.round((completedCount * 100f) / total);
        return new JourneyProgressView(journey.getId(), enrollment.getId(), completedCount, total, percent, result);
    }

    private boolean isCompleted(JourneyStage stage, Enrollment enrollment, JourneyStageProgress stored) {
        if (stage.getCompletionRule() == JourneyCompletionRule.MANUAL) {
            return stored != null && stored.getCompletedAt() != null;
        }
        Activity activity = stage.getActivity();
        if (activity == null) return false;
        Collection<ActivitySubmissionStatus> accepted = stage.getCompletionRule() == JourneyCompletionRule.ACTIVITY_GRADED
                ? List.of(ActivitySubmissionStatus.GRADED)
                : List.of(ActivitySubmissionStatus.SUBMITTED, ActivitySubmissionStatus.UNDER_REVIEW, ActivitySubmissionStatus.GRADED);
        return submissionRepository.existsByActivityIdAndEnrollmentIdAndStatusIn(activity.getId(), enrollment.getId(), accepted);
    }

    private Instant completionTimestamp(JourneyStage stage, Enrollment enrollment, JourneyStageProgress stored) {
        if (stage.getCompletionRule() == JourneyCompletionRule.MANUAL) {
            return stored == null ? null : stored.getCompletedAt();
        }
        if (stage.getActivity() == null) return null;
        Collection<ActivitySubmissionStatus> accepted = stage.getCompletionRule() == JourneyCompletionRule.ACTIVITY_GRADED
                ? List.of(ActivitySubmissionStatus.GRADED)
                : List.of(ActivitySubmissionStatus.SUBMITTED, ActivitySubmissionStatus.UNDER_REVIEW, ActivitySubmissionStatus.GRADED);
        return submissionRepository.findFirstByActivityIdAndEnrollmentIdAndStatusInOrderByUpdatedAtDesc(
                        stage.getActivity().getId(), enrollment.getId(), accepted
                )
                .map(submission -> submission.getStatus() == ActivitySubmissionStatus.SUBMITTED && submission.getSubmittedAt() != null
                        ? submission.getSubmittedAt()
                        : submission.getUpdatedAt())
                .orElse(null);
    }

    private String nextAction(JourneyStage stage, JourneyStageProgressStatus status) {
        if (status == JourneyStageProgressStatus.LOCKED) return "WAIT_FOR_PREVIOUS_STAGE";
        if (status == JourneyStageProgressStatus.COMPLETED) return "NONE";
        if (stage.getActivity() != null) return "OPEN_ACTIVITY";
        if (stage.getCompletionRule() == JourneyCompletionRule.MANUAL) return "COMPLETE_STAGE";
        return "NONE";
    }

    private void applyStages(Journey journey, List<StageInput> inputs) {
        List<StageInput> safe = inputs == null ? List.of() : inputs;
        Map<UUID, JourneyStage> existing = new HashMap<>();
        journey.getStages().forEach(stage -> existing.put(stage.getId(), stage));
        Set<UUID> reused = new HashSet<>();

        for (int position = 0; position < safe.size(); position++) {
            StageInput input = safe.get(position);
            validateStage(input, position + 1);
            UUID requestedId = parseUuid(input.id());
            JourneyStage stage = requestedId == null ? null : existing.get(requestedId);
            if (stage == null) {
                stage = new JourneyStage(input.title().trim(), position);
                journey.addStage(stage);
            } else {
                reused.add(stage.getId());
            }
            Activity activity = input.activityId() == null ? null : requireActivity(input.activityId());
            if (activity != null && !activity.getClassroom().getId().equals(journey.getClassroom().getId())) {
                throw new IllegalArgumentException("A atividade da etapa precisa pertencer à mesma turma da jornada.");
            }
            JourneyUnlockRule unlockRule = position == 0
                    ? JourneyUnlockRule.IMMEDIATE
                    : Objects.requireNonNullElse(input.unlockRule(), JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED);
            JourneyCompletionRule completionRule = Objects.requireNonNullElse(input.completionRule(), JourneyCompletionRule.MANUAL);
            if (completionRule != JourneyCompletionRule.MANUAL && activity == null) {
                throw new IllegalArgumentException("Etapas concluídas por atividade precisam referenciar uma atividade.");
            }
            stage.update(input.title().trim(), clean(input.description()), position, activity, unlockRule, completionRule);
        }

        List<JourneyStage> stale = journey.getStages().stream()
                .filter(stage -> stage.getId() != null && existing.containsKey(stage.getId()) && !reused.contains(stage.getId()))
                .toList();
        stale.forEach(journey::removeStage);
    }

    private boolean sameStageShape(Journey journey, List<StageInput> inputs) {
        if (inputs.size() != journey.getStages().size()) return false;
        for (int i = 0; i < inputs.size(); i++) {
            StageInput input = inputs.get(i);
            JourneyStage stage = journey.getStages().get(i);
            JourneyUnlockRule expectedUnlock = i == 0
                    ? JourneyUnlockRule.IMMEDIATE
                    : Objects.requireNonNullElse(input.unlockRule(), JourneyUnlockRule.PREVIOUS_STAGE_COMPLETED);
            JourneyCompletionRule expectedCompletion = Objects.requireNonNullElse(input.completionRule(), JourneyCompletionRule.MANUAL);
            UUID currentActivityId = stage.getActivity() == null ? null : stage.getActivity().getId();
            if (!Objects.equals(parseUuid(input.id()), stage.getId())
                    || !Objects.equals(input.title() == null ? null : input.title().trim(), stage.getTitle())
                    || !Objects.equals(clean(input.description()), stage.getDescription())
                    || !Objects.equals(input.activityId(), currentActivityId)
                    || expectedUnlock != stage.getUnlockRule()
                    || expectedCompletion != stage.getCompletionRule()) {
                return false;
            }
        }
        return true;
    }

    private void validatePublishable(Journey journey) {
        if (journey.getStatus() == JourneyStatus.ARCHIVED) throw new IllegalStateException("Jornada arquivada não pode ser publicada novamente.");
        if (journey.getStages().isEmpty()) throw new IllegalStateException("A jornada precisa ter ao menos uma etapa.");
        for (JourneyStage stage : journey.getStages()) {
            if (stage.getCompletionRule() != JourneyCompletionRule.MANUAL && stage.getActivity() == null) {
                throw new IllegalStateException("Toda etapa automática precisa referenciar uma atividade.");
            }
        }
    }

    private void validateInput(JourneyInput input) {
        if (input == null || input.classroomId() == null) throw new IllegalArgumentException("Turma é obrigatória.");
        if (input.title() == null || input.title().isBlank()) throw new IllegalArgumentException("Título da jornada é obrigatório.");
    }

    private void validateStage(StageInput input, int position) {
        if (input == null || input.title() == null || input.title().isBlank()) {
            throw new IllegalArgumentException("Etapa " + position + " precisa de um título.");
        }
    }

    private JourneyStage requireStage(Journey journey, UUID stageId) {
        return journey.getStages().stream().filter(stage -> stage.getId().equals(stageId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Etapa da jornada não encontrada."));
    }

    private Journey requireJourney(UUID id) {
        return journeyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Jornada não encontrada."));
    }

    private Classroom requireClassroom(UUID id) {
        return classroomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
    }

    private Enrollment requireEnrollment(UUID id) {
        return enrollmentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada."));
    }

    private Activity requireActivity(UUID id) {
        return activityRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
    }

    private void requireSameClassroom(Journey journey, Enrollment enrollment) {
        if (!journey.getClassroom().getId().equals(enrollment.getClassroom().getId())) {
            throw new IllegalArgumentException("A matrícula não pertence à turma desta jornada.");
        }
    }

    private JourneyView toView(Journey journey) {
        return new JourneyView(
                journey.getId(), journey.getClassroom().getId(), journey.getTitle(), journey.getDescription(), journey.getStatus(),
                journey.getStages().stream().map(stage -> new StageView(
                        stage.getId(), stage.getPosition(), stage.getTitle(), stage.getDescription(),
                        stage.getActivity() == null ? null : stage.getActivity().getId(),
                        stage.getUnlockRule(), stage.getCompletionRule(),
                        stage.getSection() == null ? null : stage.getSection().getId(),
                        stage.getSection() == null ? null : stage.getSection().getTitle(),
                        stage.getItemType(),
                        stage.getLearningResource() == null ? null : stage.getLearningResource().getId()
                )).toList(),
                journey.getCreatedAt(), journey.getUpdatedAt()
        );
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try { return UUID.fromString(value); } catch (IllegalArgumentException ignored) { return null; }
    }

    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record JourneyInput(UUID classroomId, String title, String description, List<StageInput> stages) {}
    public record StageInput(String id, String title, String description, UUID activityId, JourneyUnlockRule unlockRule, JourneyCompletionRule completionRule) {}
    public record JourneyView(UUID id, UUID classroomId, String title, String description, JourneyStatus status, List<StageView> stages, Instant createdAt, Instant updatedAt) {}
    public record StageView(
            UUID id,
            int position,
            String title,
            String description,
            UUID activityId,
            JourneyUnlockRule unlockRule,
            JourneyCompletionRule completionRule,
            UUID sectionId,
            String sectionTitle,
            JourneyItemType itemType,
            UUID learningResourceId
    ) {}
    public record JourneyProgressView(UUID journeyId, UUID enrollmentId, int completedStages, int totalStages, int percent, List<StageProgressView> stages) {}
    public record ParticipantJourneyView(UUID journeyId, String title, String description, int percent, int completedStages, int totalStages, StageProgressView currentStage, List<StageProgressView> stages) {}
    public record StageProgressView(UUID stageId, int position, String title, String description, UUID activityId, JourneyUnlockRule unlockRule, JourneyCompletionRule completionRule, JourneyStageProgressStatus status, Instant startedAt, Instant completedAt, String nextAction) {}
}
