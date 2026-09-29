package br.com.arenadev.study;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface StudentJourneyAccessRepository extends JpaRepository<StudentJourneyAccess,UUID>{
 List<StudentJourneyAccess> findByStudentIdOrderByRedeemedAtDesc(UUID studentId);
 Optional<StudentJourneyAccess> findByStudentIdAndJourneyId(UUID studentId,UUID journeyId);
 long countByJourneyId(UUID journeyId);
}
