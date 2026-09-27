package br.com.arenadev.content;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearningResourceRepository extends JpaRepository<LearningResource, UUID> {
    List<LearningResource> findByClassroomIdOrderByUpdatedAtDesc(UUID classroomId);
}
