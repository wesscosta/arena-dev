
package br.com.arenadev.submission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface ActivityProviderLinkRepository extends JpaRepository<ActivityProviderLink, UUID> {
    List<ActivityProviderLink> findByActivityIdOrderByProviderAsc(UUID activityId);
    Optional<ActivityProviderLink> findByActivityIdAndProvider(UUID activityId, LearningPlatformProvider provider);
}
