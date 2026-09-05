package br.com.arenadev.session;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {
    List<ClassSession> findByClassroomIdOrderByStartedAtDesc(UUID classroomId);

    boolean existsByClassroomIdAndStatus(UUID classroomId, SessionStatus status);

    boolean existsByClassroomId(UUID classroomId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select session
            from ClassSession session
            where session.id = :id
            """)
    Optional<ClassSession> findByIdForUpdate(@Param("id") UUID id);
}
