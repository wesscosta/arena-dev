package br.com.arenadev.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionJoinCodeRepository extends JpaRepository<SessionJoinCode, UUID> {
    Optional<SessionJoinCode> findByCodeIgnoreCaseAndActiveTrue(String code);
    Optional<SessionJoinCode> findBySessionId(UUID sessionId);
    List<SessionJoinCode> findBySessionClassroomIdInAndActiveTrueOrderBySessionStartedAtDesc(List<UUID> classroomIds);
    Optional<SessionJoinCode> findBySessionIdAndActiveTrue(UUID sessionId);
    boolean existsByCodeIgnoreCase(String code);
}
