package br.com.arenadev.journey;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JourneyRepository extends JpaRepository<Journey, UUID> {
    List<Journey> findByClassroomIdOrderByUpdatedAtDesc(UUID classroomId);
}
