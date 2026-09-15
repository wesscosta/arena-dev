package br.com.arenadev.submission;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;

@Service
public class BatchAssessmentService {
    private static final int MAX_BATCH = 20;
    private final SubmissionDashboardService dashboardService;
    private final AiAssessmentService aiAssessmentService;

    public BatchAssessmentService(SubmissionDashboardService dashboardService, AiAssessmentService aiAssessmentService) {
        this.dashboardService = dashboardService;
        this.aiAssessmentService = aiAssessmentService;
    }

    public QueueView queue(UUID activityId) {
        var dashboard = dashboardService.dashboard(activityId);
        List<QueueItem> items = dashboard.students().stream()
                .filter(row -> row.submissionId() != null)
                .filter(row -> row.status() == SubmissionDashboardStatus.SUBMITTED || row.status() == SubmissionDashboardStatus.UNDER_REVIEW)
                .map(row -> new QueueItem(row.submissionId(), row.enrollmentId(), row.displayName(), row.studentName(), row.status(), priority(row.status()), row.submittedAt(), row.updatedAt(), row.itemCount()))
                .sorted(Comparator.comparingInt(QueueItem::priority)
                        .thenComparing(item -> timestamp(item.submittedAt(), item.updatedAt()))
                        .thenComparing(QueueItem::displayName, String.CASE_INSENSITIVE_ORDER))
                .toList();
        long waiting = items.stream().filter(i -> i.status() == SubmissionDashboardStatus.SUBMITTED).count();
        long inReview = items.stream().filter(i -> i.status() == SubmissionDashboardStatus.UNDER_REVIEW).count();
        return new QueueView(activityId, dashboard.activityTitle(), items.size(), waiting, inReview, items);
    }

    public BatchResult generateAiSuggestions(UUID activityId, List<UUID> submissionIds) {
        if (submissionIds == null || submissionIds.isEmpty()) throw new IllegalArgumentException("Selecione ao menos uma entrega.");
        List<UUID> unique = new ArrayList<>(new LinkedHashSet<>(submissionIds));
        if (unique.size() > MAX_BATCH) throw new IllegalArgumentException("O lote aceita no máximo 20 entregas por execução.");
        List<BatchItemResult> results = new ArrayList<>();
        for (UUID submissionId : unique) {
            try {
                var suggestion = aiAssessmentService.generate(activityId, submissionId);
                results.add(new BatchItemResult(submissionId, true, suggestion.suggestionId(), "Sugestão preparada para revisão do professor."));
            } catch (RuntimeException error) {
                String message = error.getMessage();
                results.add(new BatchItemResult(submissionId, false, null, message == null || message.isBlank() ? "Não foi possível preparar a sugestão." : message));
            }
        }
        long succeeded = results.stream().filter(BatchItemResult::success).count();
        return new BatchResult(unique.size(), succeeded, unique.size() - succeeded, results);
    }

    private static int priority(SubmissionDashboardStatus status) { return status == SubmissionDashboardStatus.SUBMITTED ? 0 : 1; }
    private static Instant timestamp(Instant submittedAt, Instant updatedAt) { return submittedAt != null ? submittedAt : updatedAt != null ? updatedAt : Instant.EPOCH; }

    public record QueueView(UUID activityId, String activityTitle, int total, long waiting, long inReview, List<QueueItem> items) {}
    public record QueueItem(UUID submissionId, UUID enrollmentId, String displayName, String studentName, SubmissionDashboardStatus status, int priority, Instant submittedAt, Instant updatedAt, long itemCount) {}
    public record BatchResult(int requested, long succeeded, long failed, List<BatchItemResult> items) {}
    public record BatchItemResult(UUID submissionId, boolean success, UUID suggestionId, String message) {}
}
