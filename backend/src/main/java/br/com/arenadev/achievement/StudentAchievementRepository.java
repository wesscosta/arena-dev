package br.com.arenadev.achievement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentAchievementRepository extends JpaRepository<StudentAchievement, UUID> {
    List<StudentAchievement> findByStudentIdOrderByUnlockedAtAsc(UUID studentId);
    Optional<StudentAchievement> findByStudentIdAndCode(UUID studentId, AchievementCode code);
}
