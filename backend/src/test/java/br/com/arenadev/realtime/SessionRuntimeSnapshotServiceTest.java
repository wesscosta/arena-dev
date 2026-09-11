package br.com.arenadev.realtime;

import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.poll.PollService;
import br.com.arenadev.quiz.QuizService;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.wordcloud.WordCloudService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionRuntimeSnapshotServiceTest {

    @Test
    void participantSnapshotUsesPublicBuzzerProjectionAndKeepsPrivateInteractionStateSeparate() {
        UUID sessionId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();

        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);
        WordCloudService wordCloudService = mock(WordCloudService.class);
        PollService pollService = mock(PollService.class);
        QuizService quizService = mock(QuizService.class);
        LiveStageService liveStageService = mock(LiveStageService.class);
        MechanicsService mechanicsService = mock(MechanicsService.class);

        var stage = mock(LiveStageService.StateView.class);
        var publicBuzzer = new BuzzerService.PublicBuzzerStateView(
                "OPEN",
                UUID.randomUUID(),
                "2026-09-08T20:00:00Z",
                null,
                List.of(new BuzzerService.PublicBuzzerPressView(1, "Ana", "2026-09-08T20:00:01Z"))
        );
        var privateBuzzer = new BuzzerService.ParticipantBuzzerStateView(publicBuzzer.roundId(), 2);
        var timer = new SessionTimerService.TimerStateView(null);
        var wordCloud = WordCloudService.StateView.empty();
        var wordCloudParticipant = WordCloudService.ParticipantStateView.empty();
        var poll = PollService.StateView.empty();
        var pollParticipant = PollService.ParticipantStateView.empty();
        var quiz = QuizService.StateView.empty();
        var quizParticipant = QuizService.ParticipantStateView.empty();
        var boss = new MechanicsService.BossState("Spaghetti Code", 100, 70);
        var runtime = new MechanicsService.RuntimeView(
                sessionId,
                java.util.Map.of(),
                null,
                boss,
                null,
                null,
                List.of(),
                null,
                null,
                List.of(),
                2
        );

        when(liveStageService.participantState(sessionId)).thenReturn(stage);
        when(buzzerService.projectorState(sessionId)).thenReturn(publicBuzzer);
        when(buzzerService.participantState(sessionId, participantId)).thenReturn(privateBuzzer);
        when(timerService.state(sessionId)).thenReturn(timer);
        when(wordCloudService.state(sessionId)).thenReturn(wordCloud);
        when(wordCloudService.participantState(sessionId, participantId)).thenReturn(wordCloudParticipant);
        when(pollService.publicState(sessionId)).thenReturn(poll);
        when(pollService.participantState(sessionId, participantId)).thenReturn(pollParticipant);
        when(quizService.publicState(sessionId)).thenReturn(quiz);
        when(quizService.participantState(sessionId, participantId)).thenReturn(quizParticipant);
        when(mechanicsService.getRuntime(sessionId)).thenReturn(runtime);

        SessionRuntimeSnapshotService service = new SessionRuntimeSnapshotService(
                buzzerService,
                timerService,
                wordCloudService,
                pollService,
                quizService,
                liveStageService,
                mechanicsService
        );

        var snapshot = service.participant(sessionId, participantId);

        assertThat(snapshot.stage()).isSameAs(stage);
        assertThat(snapshot.buzzer()).isSameAs(publicBuzzer);
        assertThat(snapshot.buzzerParticipant()).isSameAs(privateBuzzer);
        assertThat(snapshot.wordCloudParticipant()).isSameAs(wordCloudParticipant);
        assertThat(snapshot.pollParticipant()).isSameAs(pollParticipant);
        assertThat(snapshot.quiz()).isSameAs(quiz);
        assertThat(snapshot.quizParticipant()).isSameAs(quizParticipant);
        assertThat(snapshot.boss()).isEqualTo(boss);

        verify(buzzerService).projectorState(sessionId);
        verify(buzzerService, never()).state(sessionId);
    }
}
