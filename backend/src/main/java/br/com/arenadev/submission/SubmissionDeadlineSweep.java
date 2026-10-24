package br.com.arenadev.submission;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.UUID;

/** Completes timed attempts even when students close their browsers. */
@Component
public class SubmissionDeadlineSweep {
    private static final Logger log = LoggerFactory.getLogger(SubmissionDeadlineSweep.class);
    private final ActivitySubmissionRepository repository;
    private final SubmissionDeadlineService deadlines;

    public SubmissionDeadlineSweep(ActivitySubmissionRepository repository, SubmissionDeadlineService deadlines) {
        this.repository = repository;
        this.deadlines = deadlines;
    }

    @Scheduled(fixedDelay = 15_000, initialDelay = 15_000)
    public void sweep() {
        for (UUID id : repository.findExpiredIds(
                ActivitySubmissionStatus.IN_PROGRESS, Instant.now(), PageRequest.of(0, 200))) {
            try {
                deadlines.expireIfDue(id);
            } catch (RuntimeException error) {
                // Never abort the whole sweep because one attempt failed.
                log.warn("Não foi possível finalizar tentativa vencida {}", id, error);
            }
        }
    }
}
