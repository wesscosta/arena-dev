package br.com.arenadev.learning.presentation;

import br.com.arenadev.content.CanonicalDocument;
import br.com.arenadev.content.ContentCanonicalizer;
import br.com.arenadev.content.LearningResourceFormat;
import br.com.arenadev.content.LearningResourceRepository;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionStatus;
import br.com.arenadev.stage.LiveStageService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MaterialPublicationService {
    private static final int MAX_BODY_LENGTH = 120_000;
    private final JdbcTemplate jdbc;
    private final ClassSessionRepository sessions;
    private final LearningResourceRepository resources;
    private final SessionJoinService joins;
    private final LiveStageService stage;
    private final ContentCanonicalizer canonicalizer;
    private final JsonMapper json;

    public MaterialPublicationService(JdbcTemplate jdbc, ClassSessionRepository sessions,
            LearningResourceRepository resources, SessionJoinService joins, LiveStageService stage,
            ContentCanonicalizer canonicalizer, JsonMapper json) {
        this.jdbc = jdbc;
        this.sessions = sessions;
        this.resources = resources;
        this.joins = joins;
        this.stage = stage;
        this.canonicalizer = canonicalizer;
        this.json = json;
    }

    @Transactional
    public PublicationView publish(UUID sessionId, PublishCommand input) {
        if (input == null || input.resourceId() == null || input.requestId() == null
                || input.expectedVersion() == null || input.expectedVersion() < 0) {
            throw new IllegalArgumentException("Informe recurso, requestId e versão esperada.");
        }
        var session = sessions.findByIdForUpdate(sessionId).orElseThrow(MaterialPublicationService::notFound);
        PublicationView prior = byRequest(sessionId, input.requestId());
        if (prior != null) {
            if (!prior.resourceId().equals(input.resourceId())
                    || prior.expectedStageVersion() != input.expectedVersion()) {
                throw conflict("requestId já utilizado por publicação diferente.");
            }
            return prior; // Never resurrect a revoked replay.
        }
        if (session.getStatus() != SessionStatus.ACTIVE) throw conflict("Sessão encerrada.");
        if (stage.version(sessionId) != input.expectedVersion()) throw conflict("Palco desatualizado.");
        var linked = jdbc.query("""
                select resource_id from arena_session_resource_placements where session_id=?
                """, (rs, row) -> rs.getObject(1, UUID.class), sessionId);
        if (linked.isEmpty() || !linked.getFirst().equals(input.resourceId())) {
            throw conflict("Vincule o material antes de apresentá-lo.");
        }
        var resource = resources.findById(input.resourceId()).orElseThrow(MaterialPublicationService::notFound);
        if (!resource.isLibraryVisible() || resource.getArchivedAt() != null || resource.getClassroom() != null) {
            throw notFound();
        }
        if (resource.getFormat() == LearningResourceFormat.LINK) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "LINK não é apresentável.");
        }
        String body = resource.getBody();
        if (body == null || body.isBlank() || body.length() > MAX_BODY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Material vazio ou extenso demais.");
        }
        // Until the safe projector reader (11.2), refuse active markup and external images.
        if (body.matches("(?is).*(<\\s*(script|iframe|object|embed|svg|img|video|audio)\\b|javascript\\s*:|data\\s*:|!\\s*\\[[^]]*]\\s*\\().*")) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Conteúdo ativo ou imagem não autorizada.");
        }
        CanonicalDocument document = canonicalizer.canonicalize(
                resource.getTitle(), body, resource.getFormat(), resource.getSourceUrl(),
                resource.getSubject(), resource.getTags(), resource.getLanguage());
        UUID publicationId = UUID.randomUUID();
        long nextVersion = input.expectedVersion() + 1;
        stage.revokeActiveUnderLock(sessionId);
        jdbc.update("""
                insert into arena_material_publications
                  (id,session_id,resource_id,resource_revision,title,format,snapshot_body,
                   outline_json,parser_version,content_sha256,request_id,
                   expected_stage_version,published_stage_version,status)
                values (?,?,?,?,?,?,?,cast(? as jsonb),?,?,?,?,?,'ACTIVE')
                """, publicationId, sessionId, resource.getId(), resource.getRevision(),
                document.title(), document.format().name(), document.body(),
                json.writeValueAsString(document.sections()), document.parserVersion(),
                document.contentSha256(), input.requestId(), input.expectedVersion(), nextVersion);
        stage.showPublishedMaterialUnderLock(sessionId, publicationId, nextVersion);
        return find(publicationId);
    }

    @Transactional
    public PublicationView withdraw(UUID sessionId, WithdrawCommand input) {
        if (input == null || input.publicationId() == null || input.requestId() == null
                || input.expectedVersion() == null || input.expectedVersion() < 0) {
            throw new IllegalArgumentException("Informe publicação, requestId e versão esperada.");
        }
        sessions.findByIdForUpdate(sessionId).orElseThrow(MaterialPublicationService::notFound);
        PublicationView current = find(input.publicationId());
        if (!current.sessionId().equals(sessionId)) throw notFound();
        if ("REVOKED".equals(current.status())) {
            if (input.requestId().equals(current.withdrawRequestId())) return current;
            throw conflict("Publicação já retirada.");
        }
        if (stage.version(sessionId) != input.expectedVersion()) throw conflict("Palco desatualizado.");
        if (!stage.isPublishedMaterial(sessionId, input.publicationId())) throw conflict("Publicação não está no palco.");
        jdbc.update("""
                update arena_material_publications
                   set status='REVOKED',revoked_at=now(),withdraw_request_id=?
                 where id=? and status='ACTIVE'
                """, input.requestId(), input.publicationId());
        stage.clearPublishedMaterialUnderLock(sessionId);
        return find(input.publicationId());
    }

    /**
     * Per-session serialized CAS; requestId persists across retries/restarts.
     * A section command cannot modify the immutable publication snapshot.
     */
    @Transactional
    public LiveStageService.StateView navigate(UUID sessionId, SectionCommand command) {
        if (command == null || command.publicationId() == null
                || command.requestId() == null || command.expectedVersion() == null
                || command.expectedVersion() < 0
                || (command.anchor() != null
                    && (command.anchor().length() > 220
                        || !command.anchor().matches("[a-z0-9]+(?:-[a-z0-9]+)*")))) {
            throw new IllegalArgumentException("Informe uma publicação, requestId, versão e âncora válidos.");
        }
        var session = sessions.findByIdForUpdate(sessionId).orElseThrow(MaterialPublicationService::notFound);
        var previous = jdbc.query("""
                select publication_id, section_anchor, expected_stage_version
                from arena_material_section_commands where session_id=? and request_id=?
                """, (rs, row) -> new SectionCommand(
                rs.getObject("publication_id", UUID.class),
                rs.getString("section_anchor"), rs.getLong("expected_stage_version"),
                command.requestId()), sessionId, command.requestId());
        if (!previous.isEmpty()) {
            var recorded = previous.getFirst();
            if (!recorded.publicationId().equals(command.publicationId())
                    || !java.util.Objects.equals(recorded.anchor(), command.anchor())
                    || !recorded.expectedVersion().equals(command.expectedVersion())) {
                throw conflict("requestId já utilizado para outra navegação.");
            }
            // Replay never restores a superseded or revoked stage.
            return stage.state(sessionId);
        }
        if (session.getStatus() != SessionStatus.ACTIVE) throw conflict("Sessão encerrada.");
        if (stage.version(sessionId) != command.expectedVersion()
                || !stage.isPublishedMaterial(sessionId, command.publicationId())) {
            throw conflict("Palco ou publicação desatualizados.");
        }
        var outlineRows = jdbc.query("""
                select p.outline_json::text from arena_material_publications p
                join learning_resources r on r.id=p.resource_id
                join arena_session_resource_placements x on x.session_id=p.session_id
                    and x.resource_id=p.resource_id
                where p.id=? and p.session_id=? and p.status='ACTIVE'
                  and r.library_visible=true and r.archived_at is null and r.classroom_id is null
                """, (rs, row) -> rs.getString(1), command.publicationId(), sessionId);
        if (outlineRows.isEmpty()) throw notFound();
        List<CanonicalDocument.Section> sections = readOutline(outlineRows.getFirst());
        if (command.anchor() != null && !containsAnchor(sections, command.anchor())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "A seção não pertence ao snapshot apresentado.");
        }
        long newVersion = command.expectedVersion() + 1;
        var result = stage.navigateMaterialUnderLock(
                sessionId, command.publicationId(), command.anchor(), command.expectedVersion());
        jdbc.update("""
                insert into arena_material_section_commands
                  (session_id,request_id,publication_id,section_anchor,
                   expected_stage_version,applied_stage_version)
                values(?,?,?,?,?,?)
                """, sessionId, command.requestId(), command.publicationId(),
                command.anchor(), command.expectedVersion(), newVersion);
        return result;
    }

    private static boolean containsAnchor(List<CanonicalDocument.Section> sections, String anchor) {
        for (var section : sections) {
            if (section.anchor().equals(anchor) || containsAnchor(section.children(), anchor)) return true;
        }
        return false;
    }

    private List<CanonicalDocument.Section> readOutline(String raw) {
        return json.readValue(raw, new TypeReference<List<CanonicalDocument.Section>>() {});
    }

    @Transactional(readOnly = true)
    public PublicationView current(UUID sessionId) {
        sessions.findById(sessionId).orElseThrow(MaterialPublicationService::notFound);
        var ids = jdbc.query("""
                select id from arena_material_publications
                 where session_id=? and status='ACTIVE'
                """, (rs, row) -> rs.getObject(1,UUID.class), sessionId);
        return ids.isEmpty() ? null : find(ids.getFirst());
    }

    @Transactional(readOnly = true)
    public PublicMaterialView publicMaterial(String code) {
        var publicSession = joins.lookup(code);
        var session = sessions.findById(publicSession.sessionId()).orElseThrow(MaterialPublicationService::notFound);
        if (session.getStatus() != SessionStatus.ACTIVE) throw notFound();
        UUID sessionId = publicSession.sessionId();
        UUID activeId = stage.activeMaterialId(sessionId);
        if (activeId == null) throw notFound();
        var content = jdbc.query("""
                select p.id,p.title,p.resource_revision,p.format,p.snapshot_body,
                       p.outline_json::text,p.parser_version,p.content_sha256
                from arena_material_publications p
                join learning_resources r on r.id=p.resource_id
                join arena_session_resource_placements x on x.session_id=p.session_id
                     and x.resource_id=p.resource_id
                where p.id=? and p.session_id=? and p.status='ACTIVE'
                  and r.library_visible=true and r.archived_at is null and r.classroom_id is null
                """, (rs, row) -> new PublicMaterialView(
                rs.getObject("id", UUID.class), rs.getString("title"),
                rs.getInt("resource_revision"), rs.getString("format"), rs.getString("snapshot_body"),
                readOutline(rs.getString("outline_json")),
                rs.getString("parser_version"), rs.getString("content_sha256"), stage.version(sessionId)
        ), activeId, sessionId);
        if (content.isEmpty()) throw notFound();
        return content.getFirst();
    }

    private PublicationView byRequest(UUID sessionId, UUID requestId) {
        var ids = jdbc.query("""
                select id from arena_material_publications where session_id=? and request_id=?
                """, (rs,row) -> rs.getObject(1, UUID.class), sessionId,requestId);
        return ids.isEmpty() ? null : find(ids.getFirst());
    }

    private PublicationView find(UUID id) {
        var rows = jdbc.query("""
                select id,session_id,resource_id,resource_revision,title,status,request_id,
                       expected_stage_version,published_stage_version,withdraw_request_id,created_at,revoked_at,
                       outline_json::text
                from arena_material_publications where id=?
                """, (rs, row) -> new PublicationView(
                rs.getObject("id",UUID.class),rs.getObject("session_id",UUID.class),
                rs.getObject("resource_id",UUID.class),rs.getInt("resource_revision"),
                rs.getString("title"),rs.getString("status"),rs.getObject("request_id",UUID.class),
                rs.getLong("expected_stage_version"),rs.getLong("published_stage_version"),
                rs.getObject("withdraw_request_id",UUID.class),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("revoked_at")==null?null:rs.getTimestamp("revoked_at").toInstant(),
                readOutline(rs.getString("outline_json"))
        ), id);
        if (rows.isEmpty()) throw notFound();
        return rows.getFirst();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicação indisponível.");
    }
    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    public record SectionCommand(UUID publicationId, String anchor, Long expectedVersion, UUID requestId) {}
    public record PublishCommand(UUID resourceId, Long expectedVersion, UUID requestId) {}
    public record WithdrawCommand(UUID publicationId, Long expectedVersion, UUID requestId) {}
    public record PublicationView(UUID id, UUID sessionId, UUID resourceId,
            int resourceRevision, String title, String status, UUID requestId,
            long expectedStageVersion, long publishedStageVersion,
            UUID withdrawRequestId, Instant createdAt, Instant revokedAt,
            List<CanonicalDocument.Section> outline) {}
    // Only safe public fields. No source reference, external token, resourceId, or individual data.
    public record PublicMaterialView(UUID publicationId, String title, int revision, String format,
            String body, List<CanonicalDocument.Section> outline,
            String parserVersion, String contentHash, long stageVersion) {}
}
