package br.com.arenadev.ranking;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.Student;
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
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionRankingServiceTest {

    @Test
    void buildsCompetitionRankingFromSessionScoreEventsAndIncludesZeroPointParticipants() {
        Fixture fixture = fixture();

        Student ana = student("Ana");
        Student bruno = student("Bruno");
        Student clara = student("Clara");
        Student diego = student("Diego");

        List<SessionParticipant> participants = List.of(
                participant(fixture.session, ana),
                participant(fixture.session, bruno),
                participant(fixture.session, clara),
                participant(fixture.session, diego)
        );
        List<ScoreEvent> events = List.of(
                score(ana, 100),
                score(bruno, 100),
                score(clara, 80)
        );
        when(fixture.participantRepository.findBySessionIdOrderByStudentNameAsc(fixture.sessionId))
                .thenReturn(participants);
        when(fixture.scoreEventRepository.findBySessionIdOrderByCreatedAtAsc(fixture.sessionId))
                .thenReturn(events);
        names(fixture, ana, bruno, clara, diego);

        var state = fixture.service.state(fixture.sessionId);

        assertThat(state.hasScoreEvents()).isTrue();
        assertThat(state.scoredParticipantCount()).isEqualTo(3);
        assertThat(state.entries())
                .extracting(
                        SessionRankingService.RankingEntryView::displayName,
                        SessionRankingService.RankingEntryView::score,
                        SessionRankingService.RankingEntryView::position
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Ana", 100, 1),
                        org.assertj.core.groups.Tuple.tuple("Bruno", 100, 1),
                        org.assertj.core.groups.Tuple.tuple("Clara", 80, 3),
                        org.assertj.core.groups.Tuple.tuple("Diego", 0, 4)
                );
        assertThat(state.entries().get(3).hasScoreEvents()).isFalse();
    }

    @Test
    void negativeReversalEventsNaturallyReduceTheSessionTotal() {
        Fixture fixture = fixture();

        Student ana = student("Ana");
        Student bruno = student("Bruno");
        List<SessionParticipant> participants = List.of(
                participant(fixture.session, ana),
                participant(fixture.session, bruno)
        );
        List<ScoreEvent> events = List.of(
                score(ana, 100),
                score(ana, -100),
                score(bruno, 50)
        );
        when(fixture.participantRepository.findBySessionIdOrderByStudentNameAsc(fixture.sessionId))
                .thenReturn(participants);
        when(fixture.scoreEventRepository.findBySessionIdOrderByCreatedAtAsc(fixture.sessionId))
                .thenReturn(events);
        names(fixture, ana, bruno);

        var state = fixture.service.state(fixture.sessionId);

        assertThat(state.entries())
                .extracting(
                        SessionRankingService.RankingEntryView::displayName,
                        SessionRankingService.RankingEntryView::score,
                        SessionRankingService.RankingEntryView::position
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Bruno", 50, 1),
                        org.assertj.core.groups.Tuple.tuple("Ana", 0, 2)
                );
    }

    @Test
    void publicProjectionCanAnonymizeNamesWithoutExposingTeacherFields() {
        Fixture fixture = fixture();

        Student maria = student("Maria Clara");
        Student joao = student("João Pedro");
        List<SessionParticipant> participants = List.of(
                participant(fixture.session, maria),
                participant(fixture.session, joao)
        );
        List<ScoreEvent> events = List.of(score(maria, 90), score(joao, 50));
        when(fixture.participantRepository.findBySessionIdOrderByStudentNameAsc(fixture.sessionId))
                .thenReturn(participants);
        when(fixture.scoreEventRepository.findBySessionIdOrderByCreatedAtAsc(fixture.sessionId))
                .thenReturn(events);
        names(fixture, maria, joao);

        SessionDynamic dynamic = mock(SessionDynamic.class);
        when(dynamic.getStateJson())
                .thenReturn("{\"visible\":true,\"anonymized\":true,\"limit\":\"TOP_5\"}");
        when(fixture.dynamicRepository.findBySessionIdAndType(fixture.sessionId, DynamicType.RANKING))
                .thenReturn(Optional.of(dynamic));

        var state = fixture.service.publicState(fixture.sessionId);

        assertThat(state.visible()).isTrue();
        assertThat(state.anonymized()).isTrue();
        assertThat(state.entries())
                .extracting(
                        SessionRankingService.PublicRankingEntryView::displayName,
                        SessionRankingService.PublicRankingEntryView::score
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("M.", 90),
                        org.assertj.core.groups.Tuple.tuple("J.", 50)
                );
    }

    @Test
    void presentationUpdatePersistsTheChoiceAndNotifiesTeacherAndProjector() {
        Fixture fixture = fixture();
        when(fixture.session.getStatus()).thenReturn(SessionStatus.ACTIVE);
        when(fixture.participantRepository.findBySessionIdOrderByStudentNameAsc(fixture.sessionId))
                .thenReturn(List.of());
        when(fixture.scoreEventRepository.findBySessionIdOrderByCreatedAtAsc(fixture.sessionId))
                .thenReturn(List.of());

        var state = fixture.service.updatePresentation(
                fixture.sessionId,
                new SessionRankingService.PresentationCommand(true, true, RankingLimit.ALL)
        );

        assertThat(state.presentation().visible()).isTrue();
        assertThat(state.presentation().anonymized()).isTrue();
        assertThat(state.presentation().limit()).isEqualTo(RankingLimit.ALL);

        ArgumentCaptor<SessionDynamic> dynamicCaptor = ArgumentCaptor.forClass(SessionDynamic.class);
        verify(fixture.dynamicRepository).save(dynamicCaptor.capture());
        assertThat(dynamicCaptor.getValue().getType()).isEqualTo(DynamicType.RANKING);
        assertThat(dynamicCaptor.getValue().getStateJson()).contains("\"visible\":true");
        assertThat(dynamicCaptor.getValue().getStateJson()).contains("\"anonymized\":true");
        assertThat(dynamicCaptor.getValue().getStateJson()).contains("\"limit\":\"ALL\"");

        verify(fixture.gateway).broadcastTeachersAfterCommit(
                eq(fixture.sessionId),
                eq("SESSION_RANKING_STATE"),
                any(SessionRankingService.RankingStateView.class)
        );
        verify(fixture.gateway).broadcastProjectorsAfterCommit(
                eq(fixture.sessionId),
                eq("PUBLIC_RANKING_STATE"),
                any(SessionRankingService.PublicRankingStateView.class)
        );
    }

    private static Fixture fixture() {
        UUID sessionId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();

        ClassSession session = mock(ClassSession.class);
        Classroom classroom = mock(Classroom.class);
        when(session.getId()).thenReturn(sessionId);
        when(session.getClassroom()).thenReturn(classroom);
        when(classroom.getId()).thenReturn(classroomId);

        ClassSessionRepository sessionRepository = mock(ClassSessionRepository.class);
        SessionParticipantRepository participantRepository = mock(SessionParticipantRepository.class);
        ScoreEventRepository scoreEventRepository = mock(ScoreEventRepository.class);
        SessionDynamicRepository dynamicRepository = mock(SessionDynamicRepository.class);
        DisplayNameService displayNameService = mock(DisplayNameService.class);
        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(dynamicRepository.findBySessionIdAndType(sessionId, DynamicType.RANKING))
                .thenReturn(Optional.empty());

        SessionRankingService service = new SessionRankingService(
                sessionRepository,
                participantRepository,
                scoreEventRepository,
                dynamicRepository,
                displayNameService,
                gateway,
                JsonMapper.builder().build()
        );

        return new Fixture(
                sessionId,
                session,
                participantRepository,
                scoreEventRepository,
                dynamicRepository,
                displayNameService,
                gateway,
                service
        );
    }

    private static Student student(String name) {
        Student student = mock(Student.class);
        when(student.getId()).thenReturn(UUID.randomUUID());
        when(student.getName()).thenReturn(name);
        return student;
    }

    private static SessionParticipant participant(ClassSession session, Student student) {
        SessionParticipant participant = mock(SessionParticipant.class);
        when(participant.getId()).thenReturn(UUID.randomUUID());
        when(participant.getSession()).thenReturn(session);
        when(participant.getStudent()).thenReturn(student);
        when(participant.isPresent()).thenReturn(true);
        return participant;
    }

    private static ScoreEvent score(Student student, int points) {
        ScoreEvent event = mock(ScoreEvent.class);
        when(event.getStudent()).thenReturn(student);
        when(event.getPoints()).thenReturn(points);
        return event;
    }

    private static void names(Fixture fixture, Student... students) {
        java.util.Map<UUID, String> names = new java.util.HashMap<>();
        for (Student student : students) {
            names.put(student.getId(), student.getName());
        }
        when(fixture.displayNameService.resolveAll(
                any(UUID.class),
                org.mockito.ArgumentMatchers.anyList(),
                eq(DisplayNamePolicy.PREFERRED_NAME)
        )).thenReturn(names);
    }

    private record Fixture(
            UUID sessionId,
            ClassSession session,
            SessionParticipantRepository participantRepository,
            ScoreEventRepository scoreEventRepository,
            SessionDynamicRepository dynamicRepository,
            DisplayNameService displayNameService,
            SessionRealtimeGateway gateway,
            SessionRankingService service
    ) {
    }
}
