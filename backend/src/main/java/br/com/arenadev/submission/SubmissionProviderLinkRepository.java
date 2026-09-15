
package br.com.arenadev.submission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface SubmissionProviderLinkRepository extends JpaRepository<SubmissionProviderLink, UUID> {
    Optional<SubmissionProviderLink> findBySubmissionIdAndProvider(UUID submissionId, LearningPlatformProvider provider);
}
