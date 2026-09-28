package br.com.arenadev.study;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface StudentJourneyStageProgressRepository extends JpaRepository<StudentJourneyStageProgress,UUID>{
 Optional<StudentJourneyStageProgress> findByStageIdAndAccessId(UUID stageId,UUID accessId);
 List<StudentJourneyStageProgress> findByStageJourneyIdAndAccessId(UUID journeyId,UUID accessId);
}
