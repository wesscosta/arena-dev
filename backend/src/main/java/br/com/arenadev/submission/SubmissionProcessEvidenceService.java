package br.com.arenadev.submission;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SubmissionProcessEvidenceService {
    private static final double SIMILARITY_REVIEW_THRESHOLD = 0.80;

    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionItemRepository itemRepository;
    private final SubmissionProcessEventRepository eventRepository;
    private final JsonMapper json = JsonMapper.builder().build();

    public SubmissionProcessEvidenceService(
            ActivitySubmissionRepository submissionRepository,
            SubmissionItemRepository itemRepository,
            SubmissionProcessEventRepository eventRepository
    ) {
        this.submissionRepository = submissionRepository;
        this.itemRepository = itemRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional
    public void recordItemSaved(ActivitySubmission submission, SubmissionItem item) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("kind", item.getKind().name());
        metadata.put("position", item.getPosition());
        metadata.put("contentLength", item.getContentJson() == null ? 0 : item.getContentJson().length());
        eventRepository.save(new SubmissionProcessEvent(
                submission, item, SubmissionProcessEventType.ITEM_SAVED, encode(metadata), Instant.now()
        ));
    }

    @Transactional
    public void recordPaste(UUID activityId, UUID submissionId, UUID itemId, int characterCount) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        if (!submission.isEditable()) {
            throw new IllegalStateException("A entrega não está mais editável.");
        }
        SubmissionItem item = itemId == null ? null : itemRepository
                .findByIdAndSubmissionId(itemId, submissionId)
                .orElse(null);
        Map<String, Object> metadata = Map.of("characterCount", Math.max(0, characterCount));
        eventRepository.save(new SubmissionProcessEvent(
                submission, item, SubmissionProcessEventType.PASTE, encode(metadata), Instant.now()
        ));
    }

    @Transactional
    public void recordSubmitted(ActivitySubmission submission) {
        eventRepository.save(new SubmissionProcessEvent(
                submission, null, SubmissionProcessEventType.SUBMITTED, null, Instant.now()
        ));
    }

    @Transactional(readOnly = true)
    public EvidenceView evidence(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        List<SubmissionProcessEvent> events = eventRepository.findBySubmissionIdOrderByOccurredAtAsc(submissionId);
        List<SubmissionItem> ownItems = itemRepository.findBySubmissionIdOrderByPositionAscCreatedAtAsc(submissionId);

        long saves = events.stream().filter(e -> e.getEventType() == SubmissionProcessEventType.ITEM_SAVED).count();
        long pastes = events.stream().filter(e -> e.getEventType() == SubmissionProcessEventType.PASTE).count();
        int pastedCharacters = events.stream()
                .filter(e -> e.getEventType() == SubmissionProcessEventType.PASTE)
                .mapToInt(this::pasteChars)
                .sum();

        long durationSeconds = 0;
        if (submission.getStartedAt() != null && submission.getSubmittedAt() != null) {
            durationSeconds = Math.max(0, Duration.between(submission.getStartedAt(), submission.getSubmittedAt()).toSeconds());
        }

        SimilarityMatch similarity = highestSimilarity(submission, ownItems);
        List<String> reasons = new ArrayList<>();
        if (pastes >= 3 && pastedCharacters >= 500) {
            reasons.add("Vários eventos de colagem com volume relevante; revisar o contexto da produção.");
        }
        if (saves <= 1 && pastes > 0 && durationSeconds > 0 && durationSeconds < 180) {
            reasons.add("Poucos salvamentos e entrega muito rápida após colagem; revisar o processo, sem inferir autoria.");
        }
        if (similarity != null && similarity.score() >= SIMILARITY_REVIEW_THRESHOLD) {
            reasons.add("Alta semelhança textual com outra entrega da mesma atividade; pode haver resposta-modelo ou colaboração legítima.");
        }

        ReviewRecommendation recommendation = reasons.size() >= 2
                ? ReviewRecommendation.HIGH
                : reasons.size() == 1 ? ReviewRecommendation.MEDIUM : ReviewRecommendation.LOW;

        return new EvidenceView(
                submissionId,
                submission.getAttemptNumber(),
                submission.getStartedAt(),
                submission.getSubmittedAt(),
                durationSeconds,
                saves,
                pastes,
                pastedCharacters,
                similarity,
                recommendation,
                reasons,
                events.stream().map(this::eventView).toList()
        );
    }

    private SimilarityMatch highestSimilarity(ActivitySubmission submission, List<SubmissionItem> ownItems) {
        Set<String> ownTokens = tokens(ownItems);
        if (ownTokens.size() < 8) return null;

        SimilarityMatch best = null;
        for (ActivitySubmission other : submissionRepository.findByActivityIdOrderByUpdatedAtDesc(submission.getActivity().getId())) {
            if (other.getId().equals(submission.getId())) continue;
            Set<String> otherTokens = tokens(itemRepository.findBySubmissionIdOrderByPositionAscCreatedAtAsc(other.getId()));
            if (otherTokens.size() < 8) continue;
            double score = jaccard(ownTokens, otherTokens);
            if (best == null || score > best.score()) {
                best = new SimilarityMatch(other.getId(), round(score));
            }
        }
        return best;
    }

    private Set<String> tokens(List<SubmissionItem> items) {
        return items.stream()
                .filter(item -> item.getKind() == SubmissionItemKind.TEXT
                        || item.getKind() == SubmissionItemKind.CODE
                        || item.getKind() == SubmissionItemKind.QUESTION_RESPONSE)
                .map(SubmissionItem::getContentJson)
                .filter(Objects::nonNull)
                .flatMap(value -> Arrays.stream(value.toLowerCase(Locale.ROOT)
                        .replaceAll("[^\\p{L}\\p{N}_]+", " ")
                        .trim().split("\\s+")))
                .filter(token -> token.length() >= 3)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private double jaccard(Set<String> first, Set<String> second) {
        Set<String> intersection = new HashSet<>(first);
        intersection.retainAll(second);
        Set<String> union = new HashSet<>(first);
        union.addAll(second);
        return union.isEmpty() ? 0 : ((double) intersection.size()) / union.size();
    }

    private double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private int pasteChars(SubmissionProcessEvent event) {
        if (event.getMetadataJson() == null) return 0;
        try {
            Object value = json.readValue(event.getMetadataJson(), Map.class).get("characterCount");
            return value instanceof Number number ? number.intValue() : 0;
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (RuntimeException error) { return "{}"; }
    }

    private ActivitySubmission requireSubmission(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)) {
            throw new ResourceNotFoundException("Entrega não encontrada para esta atividade.");
        }
        return submission;
    }

    private ProcessEventView eventView(SubmissionProcessEvent event) {
        return new ProcessEventView(
                event.getId(),
                event.getEventType(),
                event.getItem() == null ? null : event.getItem().getId(),
                event.getOccurredAt(),
                event.getMetadataJson()
        );
    }

    public enum ReviewRecommendation { LOW, MEDIUM, HIGH }

    public record SimilarityMatch(UUID submissionId, double score) {}

    public record ProcessEventView(
            UUID id,
            SubmissionProcessEventType type,
            UUID itemId,
            Instant occurredAt,
            String metadataJson
    ) {}

    public record EvidenceView(
            UUID submissionId,
            int attemptNumber,
            Instant startedAt,
            Instant submittedAt,
            long durationSeconds,
            long saveCount,
            long pasteCount,
            int pastedCharacters,
            SimilarityMatch highestSimilarity,
            ReviewRecommendation recommendation,
            List<String> reasons,
            List<ProcessEventView> events
    ) {}
}
