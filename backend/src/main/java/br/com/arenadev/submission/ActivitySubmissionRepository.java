
package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ActivitySubmissionRepository extends JpaRepository<ActivitySubmission, UUID> {
    Optional<ActivitySubmission> findByActivityIdAndEnrollmentIdAndAttemptNumber(UUID activityId, UUID enrollmentId, int attemptNumber);
    List<ActivitySubmission> findByActivityIdOrderByUpdatedAtDesc(UUID activityId);
    boolean existsByActivityIdAndEnrollmentIdAndStatusIn(UUID activityId, UUID enrollmentId, Collection<ActivitySubmissionStatus> statuses);
    Optional<ActivitySubmission> findFirstByActivityIdAndEnrollmentIdAndStatusInOrderByUpdatedAtDesc(UUID activityId, UUID enrollmentId, Collection<ActivitySubmissionStatus> statuses);
}
