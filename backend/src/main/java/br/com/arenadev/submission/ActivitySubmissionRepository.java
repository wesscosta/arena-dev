
package br.com.arenadev.submission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import java.time.Instant;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ActivitySubmissionRepository extends JpaRepository<ActivitySubmission, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select submission from ActivitySubmission submission where submission.id = :id")
    Optional<ActivitySubmission> findLocked(@Param("id") UUID id);

    @Query("select s.id from ActivitySubmission s where s.status = :status and s.deadlineAt <= :now order by s.deadlineAt asc")
    List<UUID> findExpiredIds(@Param("status") ActivitySubmissionStatus status,
                             @Param("now") Instant now, Pageable pageable);

    Optional<ActivitySubmission> findByActivityIdAndEnrollmentIdAndAttemptNumber(UUID activityId, UUID enrollmentId, int attemptNumber);
    List<ActivitySubmission> findByActivityIdOrderByUpdatedAtDesc(UUID activityId);
    boolean existsByActivityIdAndEnrollmentIdAndStatusIn(UUID activityId, UUID enrollmentId, Collection<ActivitySubmissionStatus> statuses);
    Optional<ActivitySubmission> findFirstByActivityIdAndEnrollmentIdAndStatusInOrderByUpdatedAtDesc(UUID activityId, UUID enrollmentId, Collection<ActivitySubmissionStatus> statuses);
}
