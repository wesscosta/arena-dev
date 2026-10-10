package br.com.arenadev.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findByClassroomIdOrderByUpdatedAtDesc(UUID classroomId);
    boolean existsByClassroomId(UUID classroomId);

    @Query("select distinct a from Activity a join fetch a.classroom left join fetch a.questions")
    List<Activity> findAllWithQuestions();
}
