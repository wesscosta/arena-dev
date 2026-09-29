package br.com.arenadev.achievement;

import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.journey.JourneyStage;
import br.com.arenadev.journey.JourneyStageProgress;
import br.com.arenadev.journey.JourneyStageProgressRepository;
import br.com.arenadev.study.StudentJourneyStageProgress;
import br.com.arenadev.study.StudentJourneyStageProgressRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class AchievementService {
    private final StudentAchievementRepository achievements;
    private final StudentRepository students;
    private final JourneyStageProgressRepository enrollmentProgress;
    private final StudentJourneyStageProgressRepository redeemedProgress;

    public AchievementService(
            StudentAchievementRepository achievements,
            StudentRepository students,
            JourneyStageProgressRepository enrollmentProgress,
            StudentJourneyStageProgressRepository redeemedProgress
    ) {
        this.achievements = achievements;
        this.students = students;
        this.enrollmentProgress = enrollmentProgress;
        this.redeemedProgress = redeemedProgress;
    }

    @Transactional
    public List<AchievementView> evaluate(UUID studentId) {
        Student student = students.findById(studentId).orElseThrow();
        List<CompletedStage> completed = completedStages(studentId);
        if (completed.isEmpty()) return List.of();

        List<AchievementView> unlocked = new ArrayList<>();
        CompletedStage first = completed.getFirst();
        unlock(student, AchievementCode.FIRST_CONTENT_COMPLETED, AchievementSourceType.JOURNEY_STAGE,
                first.stage().getId(), first.completedAt()).ifPresent(unlocked::add);

        firstCompletedSection(completed).ifPresent(section ->
                unlock(student, AchievementCode.FIRST_MODULE_COMPLETED, AchievementSourceType.JOURNEY_SECTION,
                        section.sourceId(), section.completedAt()).ifPresent(unlocked::add));

        firstCompletedJourney(completed).ifPresent(journey ->
                unlock(student, AchievementCode.FIRST_JOURNEY_COMPLETED, AchievementSourceType.JOURNEY,
                        journey.sourceId(), journey.completedAt()).ifPresent(unlocked::add));
        return List.copyOf(unlocked);
    }

    @Transactional
    public AchievementSummary list(UUID studentId) {
        evaluate(studentId); // idempotent reconciliation for progress created before 16.4D
        Map<AchievementCode, StudentAchievement> unlocked = new EnumMap<>(AchievementCode.class);
        achievements.findByStudentIdOrderByUnlockedAtAsc(studentId).forEach(item -> unlocked.put(item.getCode(), item));
        List<AchievementView> items = Arrays.stream(AchievementCode.values())
                .map(code -> view(code, unlocked.get(code)))
                .toList();
        return new AchievementSummary((int) items.stream().filter(AchievementView::unlocked).count(), items.size(), items);
    }

    private Optional<AchievementView> unlock(Student student, AchievementCode code, AchievementSourceType sourceType, UUID sourceId, Instant when) {
        if (achievements.findByStudentIdAndCode(student.getId(), code).isPresent()) return Optional.empty();
        StudentAchievement saved = achievements.saveAndFlush(new StudentAchievement(student, code, sourceType, sourceId, when));
        return Optional.of(view(code, saved));
    }

    private List<CompletedStage> completedStages(UUID studentId) {
        List<CompletedStage> result = new ArrayList<>();
        enrollmentProgress.findByEnrollmentStudentIdAndCompletedAtIsNotNull(studentId)
                .forEach(item -> result.add(new CompletedStage(item.getStage(), item.getCompletedAt())));
        redeemedProgress.findByAccessStudentIdAndCompletedAtIsNotNull(studentId)
                .forEach(item -> result.add(new CompletedStage(item.getStage(), item.getCompletedAt())));
        return result.stream().sorted(Comparator.comparing(CompletedStage::completedAt)).toList();
    }

    private Optional<Milestone> firstCompletedSection(List<CompletedStage> completed) {
        Map<UUID, List<CompletedStage>> bySection = new LinkedHashMap<>();
        completed.stream().filter(item -> item.stage().getSection() != null)
                .forEach(item -> bySection.computeIfAbsent(item.stage().getSection().getId(), ignored -> new ArrayList<>()).add(item));
        return bySection.values().stream().map(items -> {
            JourneyStage sample = items.getFirst().stage();
            long total = sample.getJourney().getStages().stream()
                    .filter(stage -> stage.getSection() != null && stage.getSection().getId().equals(sample.getSection().getId())).count();
            if (total == 0 || items.size() < total) return null;
            Instant completedAt = items.stream().map(CompletedStage::completedAt).max(Comparator.naturalOrder()).orElseThrow();
            return new Milestone(sample.getSection().getId(), completedAt);
        }).filter(Objects::nonNull).min(Comparator.comparing(Milestone::completedAt));
    }

    private Optional<Milestone> firstCompletedJourney(List<CompletedStage> completed) {
        Map<UUID, List<CompletedStage>> byJourney = new LinkedHashMap<>();
        completed.forEach(item -> byJourney.computeIfAbsent(item.stage().getJourney().getId(), ignored -> new ArrayList<>()).add(item));
        return byJourney.values().stream().map(items -> {
            JourneyStage sample = items.getFirst().stage();
            long total = sample.getJourney().getStages().size();
            if (total == 0 || items.size() < total) return null;
            Instant completedAt = items.stream().map(CompletedStage::completedAt).max(Comparator.naturalOrder()).orElseThrow();
            return new Milestone(sample.getJourney().getId(), completedAt);
        }).filter(Objects::nonNull).min(Comparator.comparing(Milestone::completedAt));
    }

    private AchievementView view(AchievementCode code, StudentAchievement achievement) {
        return new AchievementView(code, code.title(), code.description(), achievement != null,
                achievement == null ? null : achievement.getUnlockedAt());
    }

    public record AchievementSummary(int unlocked, int total, List<AchievementView> items) {}
    public record AchievementView(AchievementCode code, String title, String description, boolean unlocked, Instant unlockedAt) {}
    private record CompletedStage(JourneyStage stage, Instant completedAt) {}
    private record Milestone(UUID sourceId, Instant completedAt) {}
}
