package br.com.arenadev.sessionevent;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SessionEventRepository extends JpaRepository<SessionEvent, UUID> {
    @Query("""
            select event
            from SessionEvent event
            where event.session.classroom.id = :classroomId
            order by event.sequenceNo desc
            """)
    List<SessionEvent> findRecentByClassroomId(
            @Param("classroomId") UUID classroomId,
            Pageable pageable
    );

    List<SessionEvent> findBySessionIdOrderBySequenceNoAsc(UUID sessionId);
}
