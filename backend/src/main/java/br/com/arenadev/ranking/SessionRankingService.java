package br.com.arenadev.ranking;

import br.com.arenadev.dynamic.DynamicType;
import br.com.arenadev.dynamic.SessionDynamic;
import br.com.arenadev.dynamic.SessionDynamicRepository;
import br.com.arenadev.identity.DisplayNamePolicy;
import br.com.arenadev.identity.DisplayNameService;
import br.com.arenadev.realtime.SessionRealtimeGateway;
import br.com.arenadev.scoring.ScoreEvent;
import br.com.arenadev.scoring.ScoreEventRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SessionRankingService {
    private final ClassSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final ScoreEventRepository scoreEventRepository;
    private final SessionDynamicRepository dynamicRepository;
    private final DisplayNameService displayNameService;
    private final SessionRealtimeGateway realtimeGateway;
    private final JsonMapper json;

    public SessionRankingService(
            ClassSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            ScoreEventRepository scoreEventRepository,
            SessionDynamicRepository dynamicRepository,
            DisplayNameService displayNameService,
            SessionRealtimeGateway realtimeGateway,
            JsonMapper json
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.scoreEventRepository = scoreEventRepository;
        this.dynamicRepository = dynamicRepository;
        this.displayNameService = displayNameService;
        this.realtimeGateway = realtimeGateway;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public RankingStateView state(UUID sessionId) {
        ClassSession session = requireSession(sessionId);
        StoredPresentation presentation = readPresentation(sessionId);
        return buildTeacherState(session, presentation, projection(session));
    }

    @Transactional(readOnly = true)
    public PublicRankingStateView publicState(UUID sessionId) {
        ClassSession session = requireSession(sessionId);
        StoredPresentation presentation = readPresentation(sessionId);
        return presentation.visible()
                ? buildPublicState(session, presentation, projection(session))
                : hiddenPublicState(sessionId, presentation);
    }

    public PublicRankingStateView hiddenPublicState(UUID sessionId) {
        return hiddenPublicState(sessionId, StoredPresentation.defaults());
    }

    private PublicRankingStateView hiddenPublicState(UUID sessionId, StoredPresentation presentation) {
        return new PublicRankingStateView(
                sessionId,
                false,
                presentation.anonymized(),
                presentation.limit(),
                false,
                0,
                List.of(),
                Instant.now()
        );
    }

    @Transactional
    public RankingStateView updatePresentation(UUID sessionId, PresentationCommand command) {
        ClassSession session = requireActiveSession(sessionId);
        StoredPresentation current = readPresentation(sessionId);
        StoredPresentation next = new StoredPresentation(
                command.visible() == null ? current.visible() : command.visible(),
                command.anonymized() == null ? current.anonymized() : command.anonymized(),
                command.limit() == null ? current.limit() : command.limit()
        );
        savePresentation(session, next);

        ProjectionData projection = projection(session);
        RankingStateView teacher = buildTeacherState(session, next, projection);
        PublicRankingStateView projector = next.visible()
                ? buildPublicState(session, next, projection)
                : hiddenPublicState(sessionId, next);
        realtimeGateway.broadcastTeachersAfterCommit(sessionId, "SESSION_RANKING_STATE", teacher);
        realtimeGateway.broadcastProjectorsAfterCommit(sessionId, "PUBLIC_RANKING_STATE", projector);
        return teacher;
    }

    public void publishScoreChange(UUID sessionId) {
        if (sessionId == null) return;
        ClassSession session = requireSession(sessionId);
        StoredPresentation presentation = readPresentation(sessionId);
        ProjectionData projection = projection(session);
        RankingStateView teacher = buildTeacherState(session, presentation, projection);
        realtimeGateway.broadcastTeachersAfterCommit(sessionId, "SESSION_RANKING_STATE", teacher);
        if (presentation.visible()) {
            PublicRankingStateView projector = buildPublicState(session, presentation, projection);
            realtimeGateway.broadcastProjectorsAfterCommit(sessionId, "PUBLIC_RANKING_STATE", projector);
        }
    }

    private RankingStateView buildTeacherState(
            ClassSession session,
            StoredPresentation presentation,
            ProjectionData projection
    ) {
        return new RankingStateView(
                session.getId(),
                new PresentationView(presentation.visible(), presentation.anonymized(), presentation.limit()),
                projection.hasScoreEvents(),
                projection.scoredParticipantCount(),
                projection.entries(),
                Instant.now()
        );
    }

    private PublicRankingStateView buildPublicState(
            ClassSession session,
            StoredPresentation presentation,
            ProjectionData projection
    ) {
        List<RankingEntryView> source = presentation.limit() == RankingLimit.TOP_5
                ? projection.entries().stream()
                    .filter(RankingEntryView::hasScoreEvents)
                    .limit(5)
                    .toList()
                : projection.entries();

        List<PublicRankingEntryView> entries = source.stream()
                .map(entry -> new PublicRankingEntryView(
                        entry.position(),
                        presentation.anonymized() ? initial(entry.displayName()) : entry.displayName(),
                        entry.score()
                ))
                .toList();

        return new PublicRankingStateView(
                session.getId(),
                true,
                presentation.anonymized(),
                presentation.limit(),
                projection.hasScoreEvents(),
                projection.scoredParticipantCount(),
                entries,
                Instant.now()
        );
    }

    private ProjectionData projection(ClassSession session) {
        UUID sessionId = session.getId();
        UUID classroomId = session.getClassroom().getId();
        List<SessionParticipant> participants = participantRepository.findBySessionIdOrderByStudentNameAsc(sessionId);
        List<ScoreEvent> events = scoreEventRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        Map<UUID, String> displayNames = displayNameService.resolveAll(
                classroomId,
                participants.stream().map(SessionParticipant::getStudent).toList(),
                DisplayNamePolicy.PREFERRED_NAME
        );

        Map<UUID, Integer> totals = new HashMap<>();
        Set<UUID> scoredStudentIds = new HashSet<>();
        for (ScoreEvent event : events) {
            UUID studentId = event.getStudent().getId();
            totals.merge(studentId, event.getPoints(), Integer::sum);
            scoredStudentIds.add(studentId);
        }

        List<RankingEntryView> entries = new ArrayList<>();
        for (SessionParticipant participant : participants) {
            var student = participant.getStudent();
            entries.add(new RankingEntryView(
                    participant.getId(),
                    student.getId(),
                    student.getName(),
                    displayNames.getOrDefault(student.getId(), student.getName()),
                    totals.getOrDefault(student.getId(), 0),
                    0,
                    scoredStudentIds.contains(student.getId()),
                    participant.isPresent(),
                    participant.isConnected()
            ));
        }

        entries.sort(
                Comparator.comparingInt(RankingEntryView::score).reversed()
                        .thenComparing(entry -> entry.displayName().toLowerCase(Locale.ROOT))
                        .thenComparing(entry -> entry.studentId().toString())
        );

        List<RankingEntryView> ranked = new ArrayList<>(entries.size());
        Integer previousScore = null;
        int currentPosition = 0;
        for (int index = 0; index < entries.size(); index++) {
            RankingEntryView entry = entries.get(index);
            if (previousScore == null || entry.score() != previousScore) {
                currentPosition = index + 1;
                previousScore = entry.score();
            }
            ranked.add(entry.withPosition(currentPosition));
        }

        return new ProjectionData(
                !events.isEmpty(),
                scoredStudentIds.size(),
                List.copyOf(ranked)
        );
    }

    private StoredPresentation readPresentation(UUID sessionId) {
        return dynamicRepository.findBySessionIdAndType(sessionId, DynamicType.RANKING)
                .map(SessionDynamic::getStateJson)
                .map(raw -> {
                    try {
                        StoredPresentation stored = json.readValue(raw, StoredPresentation.class);
                        return stored == null ? StoredPresentation.defaults() : stored.normalized();
                    } catch (RuntimeException ignored) {
                        return StoredPresentation.defaults();
                    }
                })
                .orElseGet(StoredPresentation::defaults);
    }

    private void savePresentation(ClassSession session, StoredPresentation state) {
        SessionDynamic dynamic = dynamicRepository
                .findBySessionIdAndType(session.getId(), DynamicType.RANKING)
                .orElseGet(() -> new SessionDynamic(session, DynamicType.RANKING));
        try {
            dynamic.updateState(json.writeValueAsString(state.normalized()));
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Estado do ranking não pôde ser serializado.");
        }
        dynamicRepository.save(dynamic);
    }

    private ClassSession requireSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));
    }

    private ClassSession requireActiveSession(UUID sessionId) {
        ClassSession session = requireSession(sessionId);
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalArgumentException("Sessão não está ativa.");
        }
        return session;
    }

    private static String initial(String displayName) {
        String normalized = displayName == null ? "" : displayName.trim();
        if (normalized.isBlank()) return "P.";
        int codePoint = normalized.codePointAt(0);
        return new String(Character.toChars(codePoint)).toUpperCase(Locale.ROOT) + ".";
    }

    private record StoredPresentation(
            boolean visible,
            boolean anonymized,
            RankingLimit limit
    ) {
        static StoredPresentation defaults() {
            return new StoredPresentation(false, false, RankingLimit.TOP_5);
        }

        StoredPresentation normalized() {
            return new StoredPresentation(visible, anonymized, limit == null ? RankingLimit.TOP_5 : limit);
        }
    }

    private record ProjectionData(
            boolean hasScoreEvents,
            int scoredParticipantCount,
            List<RankingEntryView> entries
    ) {
    }

    public record PresentationCommand(
            Boolean visible,
            Boolean anonymized,
            RankingLimit limit
    ) {
    }

    public record PresentationView(
            boolean visible,
            boolean anonymized,
            RankingLimit limit
    ) {
    }

    public record RankingStateView(
            UUID sessionId,
            PresentationView presentation,
            boolean hasScoreEvents,
            int scoredParticipantCount,
            List<RankingEntryView> entries,
            Instant generatedAt
    ) {
    }

    public record RankingEntryView(
            UUID participantId,
            UUID studentId,
            String fullName,
            String displayName,
            int score,
            int position,
            boolean hasScoreEvents,
            boolean present,
            boolean connected
    ) {
        RankingEntryView withPosition(int nextPosition) {
            return new RankingEntryView(
                    participantId,
                    studentId,
                    fullName,
                    displayName,
                    score,
                    nextPosition,
                    hasScoreEvents,
                    present,
                    connected
            );
        }
    }

    public record PublicRankingStateView(
            UUID sessionId,
            boolean visible,
            boolean anonymized,
            RankingLimit limit,
            boolean hasScoreEvents,
            int scoredParticipantCount,
            List<PublicRankingEntryView> entries,
            Instant generatedAt
    ) {
    }

    public record PublicRankingEntryView(
            int position,
            String displayName,
            int score
    ) {
    }
}
