package br.com.arenadev.realtime;

import br.com.arenadev.poll.PollService;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.timer.SessionTimerService;
import br.com.arenadev.wordcloud.WordCloudService;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WordCloudSocketHandlerTest {

    @Test
    void acceptsSubmissionOnlyAfterParticipantAuthentication() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        String token = "participant-token";

        SessionRealtimeGateway gateway = mock(SessionRealtimeGateway.class);
        SessionJoinService joinService = mock(SessionJoinService.class);
        BuzzerService buzzerService = mock(BuzzerService.class);
        SessionTimerService timerService = mock(SessionTimerService.class);
        WordCloudService wordCloudService = mock(WordCloudService.class);
        PollService pollService = mock(PollService.class);
        LiveStageService liveStageService = mock(LiveStageService.class);
        SessionParticipant participant = mock(SessionParticipant.class);

        var connection = new SessionJoinService.ParticipantConnectionView(
                participantId,
                UUID.randomUUID(),
                "Aluno",
                true
        );
        var participantState = new WordCloudService.ParticipantStateView(
                UUID.randomUUID(),
                false,
                2,
                0,
                List.of("Java", "API")
        );

        when(participant.getId()).thenReturn(participantId);
        when(joinService.validateParticipantToken(sessionId, token))
                .thenReturn(participant);
        when(gateway.registerParticipant(eq(sessionId), eq(participantId), any()))
                .thenReturn(1);
        when(joinService.markConnected(sessionId, token)).thenReturn(connection);
        when(buzzerService.state(sessionId))
                .thenReturn(new BuzzerService.BuzzerStateView(
                        "IDLE", null, null, null, List.of()
                ));
        when(timerService.state(sessionId))
                .thenReturn(new SessionTimerService.TimerStateView(null));
        when(wordCloudService.state(sessionId))
                .thenReturn(WordCloudService.StateView.empty());
        when(pollService.publicState(sessionId)).thenReturn(PollService.StateView.empty());
        when(pollService.participantState(sessionId, participantId)).thenReturn(PollService.ParticipantStateView.empty());
        when(liveStageService.participantState(sessionId)).thenReturn(mock(LiveStageService.StateView.class));
        when(wordCloudService.participantState(sessionId, participantId))
                .thenReturn(WordCloudService.ParticipantStateView.empty());
        when(wordCloudService.submit(
                sessionId,
                participantId,
                List.of("Java", "API")
        )).thenReturn(participantState);

        SessionSocketHandler handler = new SessionSocketHandler(
                gateway,
                joinService,
                buzzerService,
                timerService,
                wordCloudService,
                pollService,
                liveStageService
        );

        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.getUri()).thenReturn(
                URI.create("ws://localhost/ws/sessions/" + sessionId)
        );
        when(socket.getAttributes()).thenReturn(new HashMap<>());

        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(
                socket,
                new TextMessage(
                        "{\"type\":\"AUTH_PARTICIPANT\",\"token\":\""
                                + token
                                + "\"}"
                )
        );
        handler.handleTextMessage(
                socket,
                new TextMessage(
                        "{\"type\":\"WORD_CLOUD_SUBMIT\","
                                + "\"words\":[\"Java\",\"API\"]}"
                )
        );

        verify(wordCloudService).submit(
                sessionId,
                participantId,
                List.of("Java", "API")
        );
        verify(gateway).send(
                socket,
                "WORD_CLOUD_PARTICIPANT_STATE",
                sessionId,
                participantState
        );
    }
}
