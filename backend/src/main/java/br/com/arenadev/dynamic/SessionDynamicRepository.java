package br.com.arenadev.dynamic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionDynamicRepository extends JpaRepository<SessionDynamic, UUID> {
    Optional<SessionDynamic> findBySessionIdAndType(UUID sessionId, DynamicType type);
    List<SessionDynamic> findBySessionId(UUID sessionId);
}
