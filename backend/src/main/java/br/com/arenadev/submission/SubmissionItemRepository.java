package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionItemRepository extends JpaRepository<SubmissionItem, UUID> {

    List<SubmissionItem> findBySubmissionIdOrderByPositionAscCreatedAtAsc(UUID submissionId);

    Optional<SubmissionItem> findByIdAndSubmissionId(UUID id, UUID submissionId);

    Optional<SubmissionItem> findBySubmissionIdAndQuestionId(UUID submissionId, UUID questionId);
}
