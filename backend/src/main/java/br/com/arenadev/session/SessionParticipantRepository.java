package br.com.arenadev.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, UUID> {
    List<SessionParticipant> findBySessionIdOrderByStudentNameAsc(UUID sessionId);
    List<SessionParticipant> findByConnectedTrue();
    Optional<SessionParticipant> findByAccessTokenHash(String accessTokenHash);
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
