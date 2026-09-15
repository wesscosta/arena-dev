package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubmissionProcessEventRepository extends JpaRepository<SubmissionProcessEvent, UUID> {
    List<SubmissionProcessEvent> findBySubmissionIdOrderByOccurredAtAsc(UUID submissionId);
    long countBySubmissionIdAndEventType(UUID submissionId, SubmissionProcessEventType eventType);
}
