package br.com.arenadev.session;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, UUID> {
    List<SessionParticipant> findBySessionIdOrderByStudentNameAsc(UUID sessionId);
    List<SessionParticipant> findByConnectedTrue();
    Optional<SessionParticipant> findByAccessTokenHash(String accessTokenHash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select participant
            from SessionParticipant participant
            join fetch participant.student student
            where participant.session.id = :sessionId
            order by student.name asc
            """)
    List<SessionParticipant> findBySessionIdForUpdate(@Param("sessionId") UUID sessionId);

    Optional<SessionParticipant> findByIdAndSessionId(UUID id, UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select participant
            from SessionParticipant participant
            join fetch participant.student
            where participant.id = :participantId
              and participant.session.id = :sessionId
            """)
    Optional<SessionParticipant> findByIdAndSessionIdForUpdate(
            @Param("participantId") UUID participantId,
            @Param("sessionId") UUID sessionId
    );
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
