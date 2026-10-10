package br.com.arenadev.learning.loop;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LearningCycleRepository extends JpaRepository<LearningCycle, UUID> {
    List<LearningCycle> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);
    boolean existsByBaselineId(UUID baselineId);
    boolean existsByFollowupId(UUID followupId);
}
