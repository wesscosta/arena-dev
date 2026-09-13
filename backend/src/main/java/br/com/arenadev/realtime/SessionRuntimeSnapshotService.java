package br.com.arenadev.realtime;

import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.poll.PollService;
import br.com.arenadev.quiz.QuizService;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.wordcloud.WordCloudService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SessionRuntimeSnapshotService {
    private final BuzzerService buzzerService;
    private final SessionTimerService timerService;
    private final WordCloudService wordCloudService;
    private final PollService pollService;
    private final QuizService quizService;
    private final LiveStageService liveStageService;
    private final MechanicsService mechanicsService;

    public SessionRuntimeSnapshotService(
            BuzzerService buzzerService,
            SessionTimerService timerService,
            WordCloudService wordCloudService,
            PollService pollService,
            QuizService quizService,
            LiveStageService liveStageService,
            MechanicsService mechanicsService
    ) {
        this.buzzerService = buzzerService;
        this.timerService = timerService;
        this.wordCloudService = wordCloudService;
        this.pollService = pollService;
        this.quizService = quizService;
        this.liveStageService = liveStageService;
        this.mechanicsService = mechanicsService;
    }

    @Transactional(readOnly = true)
    public PublicRuntimeSnapshot projector(UUID sessionId) {
        return new PublicRuntimeSnapshot(
                liveStageService.projectorState(sessionId),
                buzzerService.projectorState(sessionId),
                timerService.state(sessionId),
                wordCloudService.state(sessionId),
                pollService.publicState(sessionId),
                quizService.publicState(sessionId),
                mechanicsService.getRuntime(sessionId).boss()
        );
    }

    @Transactional(readOnly = true)
    public ParticipantRuntimeSnapshot participant(UUID sessionId, UUID participantId) {
        PublicRuntimeSnapshot publicSnapshot = new PublicRuntimeSnapshot(
                liveStageService.participantState(sessionId),
                buzzerService.projectorState(sessionId),
                timerService.state(sessionId),
                wordCloudService.state(sessionId),
                pollService.publicState(sessionId),
                quizService.publicState(sessionId),
                mechanicsService.getRuntime(sessionId).boss()
        );
        return new ParticipantRuntimeSnapshot(
                publicSnapshot.stage(),
                publicSnapshot.buzzer(),
                publicSnapshot.timer(),
                publicSnapshot.wordCloud(),
                publicSnapshot.poll(),
                publicSnapshot.quiz(),
                publicSnapshot.boss(),
                buzzerService.participantState(sessionId, participantId),
                wordCloudService.participantState(sessionId, participantId),
                pollService.participantState(sessionId, participantId),
                quizService.participantState(sessionId, participantId)
        );
    }

    public record PublicRuntimeSnapshot(
            LiveStageService.StateView stage,
            BuzzerService.PublicBuzzerStateView buzzer,
            SessionTimerService.TimerStateView timer,
            WordCloudService.StateView wordCloud,
            PollService.StateView poll,
            QuizService.StateView quiz,
            MechanicsService.BossState boss
    ) {
    }

    public record ParticipantRuntimeSnapshot(
            LiveStageService.StateView stage,
            BuzzerService.PublicBuzzerStateView buzzer,
            SessionTimerService.TimerStateView timer,
            WordCloudService.StateView wordCloud,
            PollService.StateView poll,
            QuizService.StateView quiz,
            MechanicsService.BossState boss,
            BuzzerService.ParticipantBuzzerStateView buzzerParticipant,
            WordCloudService.ParticipantStateView wordCloudParticipant,
            PollService.ParticipantStateView pollParticipant,
            QuizService.ParticipantStateView quizParticipant
    ) {
    }
}
