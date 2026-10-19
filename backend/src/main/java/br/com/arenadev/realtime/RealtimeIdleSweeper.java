package br.com.arenadev.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;

/**
 * Closes half-open live-session sockets (Wi-Fi switch, device sleep) so
 * presence and broadcasts stop counting clients that are gone.
 */
@Configuration
@EnableScheduling
public class RealtimeIdleSweeper {
    private final SessionRealtimeGateway gateway;

    public RealtimeIdleSweeper(SessionRealtimeGateway gateway) {
        this.gateway = gateway;
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    public void sweep() {
        gateway.closeIdle(Instant.now());
    }
}
