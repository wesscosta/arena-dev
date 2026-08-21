package br.com.arenadev.dynamic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupHistoryRepository extends JpaRepository<GroupHistory, UUID> {
    List<GroupHistory> findByClassroomIdOrderByCreatedAtAsc(UUID classroomId);
}
