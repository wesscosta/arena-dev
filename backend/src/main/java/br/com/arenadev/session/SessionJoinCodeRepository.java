package br.com.arenadev.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SessionJoinCodeRepository extends JpaRepository<SessionJoinCode, UUID> {
    Optional<SessionJoinCode> findByCodeIgnoreCaseAndActiveTrue(String code);
    Optional<SessionJoinCode> findBySessionId(UUID sessionId);
    Optional<SessionJoinCode> findBySessionIdAndActiveTrue(UUID sessionId);
    boolean existsByCodeIgnoreCase(String code);
}
