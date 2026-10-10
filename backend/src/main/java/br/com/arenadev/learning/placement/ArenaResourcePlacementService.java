package br.com.arenadev.learning.placement;

import br.com.arenadev.content.LearningResourceRepository;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Canonical resource reference, not a second Library or published student artifact. */
@Service
public class ArenaResourcePlacementService {
    private final JdbcTemplate jdbc;
    private final ClassSessionRepository sessions;
    private final LearningResourceRepository resources;

    public ArenaResourcePlacementService(JdbcTemplate jdbc, ClassSessionRepository sessions,
                                         LearningResourceRepository resources) {
        this.jdbc=jdbc;
        this.sessions=sessions;
        this.resources=resources;
    }

    @Transactional(readOnly = true)
    public PlacementView get(UUID sessionId) {
        requireSession(sessionId);
        return jdbc.query("""
            select p.resource_id, r.title, r.revision,
                   (r.library_visible and r.archived_at is null) as available
              from arena_session_resource_placements p
              join learning_resources r on r.id=p.resource_id
             where p.session_id = ?
            """, rs -> rs.next() ? new PlacementView(
                rs.getObject("resource_id", UUID.class),rs.getString("title"),
                rs.getInt("revision"), rs.getBoolean("available")) : null,sessionId);
    }

    @Transactional
    public PlacementView link(UUID sessionId,UUID resourceId) {
        var session=sessions.findByIdForUpdate(sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sessão não encontrada."));
        if (session.getStatus()!= SessionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Apenas sessões ativas podem receber material.");
        }
        var resource=resources.findById(resourceId)
                .orElseThrow(()->new ResourceNotFoundException("Material da Biblioteca não encontrado."));
        // Only published canonical Library assets may be linked here; private class
        // material must not become visible by accidentally using a generic resource id.
        if (!resource.isLibraryVisible() || resource.getArchivedAt()!=null || resource.getClassroom()!=null) {
            throw new IllegalArgumentException("Selecione um material publicado na Biblioteca canônica.");
        }
        jdbc.update("""
            insert into arena_session_resource_placements(session_id,resource_id,updated_at)
            values(?,?,now())
            on conflict(session_id) do update set resource_id=excluded.resource_id,
                updated_at=case when arena_session_resource_placements.resource_id=excluded.resource_id
                    then arena_session_resource_placements.updated_at else now() end
            """,sessionId,resourceId);
        return new PlacementView(resource.getId(),resource.getTitle(),resource.getRevision(),true);
    }

    @Transactional
    public void unlink(UUID sessionId) {
        sessions.findByIdForUpdate(sessionId)
                .orElseThrow(()->new ResourceNotFoundException("Sessão não encontrada."));
        jdbc.update("delete from arena_session_resource_placements where session_id=?",sessionId);
    }

    private void requireSession(UUID id) {
        if (!sessions.existsById(id)) throw new ResourceNotFoundException("Sessão não encontrada.");
    }

    public record PlacementView(UUID resourceId,String title,int revision,boolean available) {}
}
