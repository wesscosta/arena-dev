package br.com.arenadev.realtime;

import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RealtimeStartupCleanup {
    private final SessionParticipantRepository participantRepository;

    public RealtimeStartupCleanup(SessionParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void clearStaleConnections() {
        for (SessionParticipant participant : participantRepository.findByConnectedTrue()) {
            participant.markDisconnected();
        }
    }
}
