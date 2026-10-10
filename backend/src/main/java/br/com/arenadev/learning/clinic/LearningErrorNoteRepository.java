package br.com.arenadev.learning.clinic;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearningErrorNoteRepository extends JpaRepository<LearningErrorNote, UUID> {
    List<LearningErrorNote> findByRun_IdOrderByCreatedAtAsc(UUID runId);
    Optional<LearningErrorNote> findByRun_IdAndCommandId(UUID runId, UUID commandId);
}
