
package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SubmissionAssessmentRepository extends JpaRepository<SubmissionAssessment, UUID> {
    Optional<SubmissionAssessment> findBySubmissionId(UUID submissionId);
}
