package br.com.arenadev.journey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface JourneyRedemptionCodeRepository extends JpaRepository<JourneyRedemptionCode,UUID>{
 Optional<JourneyRedemptionCode> findByJourneyId(UUID journeyId);
 Optional<JourneyRedemptionCode> findByCodeIgnoreCaseAndActiveTrue(String code);
 boolean existsByCodeIgnoreCase(String code);
}
