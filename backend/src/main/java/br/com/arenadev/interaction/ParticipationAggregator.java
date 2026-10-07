package br.com.arenadev.interaction;

import org.springframework.stereotype.Component;

@Component
public class ParticipationAggregator {
    public ParticipationResult aggregate(long participantCount, long responseCount) {
        double rate = participantCount <= 0
                ? 0.0
                : Math.min(1.0, (double) responseCount / (double) participantCount);
        return new ParticipationResult(participantCount, responseCount, rate);
    }

    public record ParticipationResult(
            long participantCount,
            long responseCount,
            double participationRate
    ) {
    }
}
