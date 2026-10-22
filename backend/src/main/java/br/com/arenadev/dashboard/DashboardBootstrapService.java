package br.com.arenadev.dashboard;

import br.com.arenadev.activity.ActivityService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only classroom bootstrap. Constant number of SQL queries regardless of the number of
 * classrooms/sessions. Runtime/mechanics for an individual session are loaded on Arena entry.
 * Does not return student access tokens, teacher secrets or answers to assessment items.
 */
@Service
public class DashboardBootstrapService {
    private final JdbcTemplate jdbc;
    private final ActivityService activities;

    public DashboardBootstrapService(JdbcTemplate jdbc, ActivityService activities) {
        this.jdbc = jdbc;
        this.activities = activities;
    }

    @Transactional(readOnly = true)
    public DashboardSnapshot bootstrap() {
        var classrooms = jdbc.query("""
                select id, name, code, active, theme_color, theme_icon,
                       student_study_access_enabled, created_at
                  from classrooms order by name, id
                """, (rs, n) -> fields("id", uuid(rs,"id"), "name", rs.getString("name"),
                    "code", rs.getString("code"), "active", rs.getBoolean("active"),
                    "themeColor", rs.getString("theme_color"), "themeIcon", rs.getString("theme_icon"),
                    "studentStudyAccessEnabled", rs.getBoolean("student_study_access_enabled"),
                    "createdAt", instant(rs,"created_at")));

        var students = jdbc.query("""
                select id, registration, name, nickname, active, created_at, email, name_pending
                  from students order by name, id
                """, (rs,n) -> fields("id", uuid(rs,"id"), "registration", rs.getString("registration"),
                    "name", rs.getString("name"), "nickname", rs.getString("nickname"),
                    "active", rs.getBoolean("active"), "createdAt", instant(rs,"created_at"),
                    "email", rs.getString("email"), "namePending", rs.getBoolean("name_pending")));

        var enrollments = jdbc.query("""
                select id, classroom_id, student_id, preferred_name, active, joined_at
                  from enrollments order by classroom_id, joined_at, id
                """, (rs,n) -> fields("id",uuid(rs,"id"), "classroomId",uuid(rs,"classroom_id"),
                    "studentId",uuid(rs,"student_id"), "preferredName",rs.getString("preferred_name"),
                    "active",rs.getBoolean("active"), "joinedAt",instant(rs,"joined_at")));

        var sessions = jdbc.query("""
                select id, classroom_id, title, status, started_at, ended_at
                  from class_sessions order by started_at desc, id desc
                """, (rs,n) -> fields("id",uuid(rs,"id"),"classroomId",uuid(rs,"classroom_id"),
                    "title",rs.getString("title"),"status",rs.getString("status"),
                    "startedAt",instant(rs,"started_at"),"endedAt",instant(rs,"ended_at")));

        var participants = jdbc.query("""
                select p.id, p.session_id, p.student_id, p.present, p.connected,
                       s.registration, s.name, s.nickname, e.preferred_name
                  from session_participants p
                  join class_sessions cs on cs.id = p.session_id
                  join students s on s.id = p.student_id
                  left join enrollments e on e.student_id=p.student_id and e.classroom_id=cs.classroom_id
                 where cs.status='ACTIVE' and cs.ended_at is null
                 order by p.session_id, s.name, p.id
                """, (rs,n) -> {
                    String preferred=rs.getString("preferred_name");
                    String nickname=rs.getString("nickname");
                    String name=rs.getString("name");
                    String effectivePreferred = preferred!=null && !preferred.isBlank() ? preferred :
                            nickname!=null && !nickname.isBlank() ? nickname : null;
                    String display = effectivePreferred != null ? effectivePreferred : name.split(" ",2)[0];
                    return fields("id",uuid(rs,"id"),"sessionId",uuid(rs,"session_id"),
                            "studentId",uuid(rs,"student_id"),"registration",rs.getString("registration"),
                            "name",name,"nickname",nickname,"preferredName",effectivePreferred,"displayName",display,
                            "present",rs.getBoolean("present"),"connected",rs.getBoolean("connected"));
                });

        var scoreEvents = jdbc.query("""
                select se.id, se.classroom_id, se.student_id, se.session_id, se.points,
                       se.category, se.description, se.source, se.activity_ref,
                       se.question_ref, se.created_at, se.reversal_of,
                       exists(select 1 from score_events reversal where reversal.reversal_of=se.id) as reversed
                  from score_events se order by se.created_at, se.id
                """, (rs,n) -> fields("id",uuid(rs,"id"),"classroomId",uuid(rs,"classroom_id"),
                    "studentId",uuid(rs,"student_id"),"sessionId",uuid(rs,"session_id"),
                    "points",rs.getInt("points"),"category",rs.getString("category"),
                    "description",rs.getString("description"),"source",rs.getString("source"),
                    "activityId",rs.getString("activity_ref"),"questionId",rs.getString("question_ref"),
                    "createdAt",instant(rs,"created_at"),"reversalOf",uuid(rs,"reversal_of"),
                    "reversed",rs.getBoolean("reversed")));

        return new DashboardSnapshot(classrooms,students,enrollments,sessions,participants,
                scoreEvents,activities.listAll());
    }

    private static UUID uuid(ResultSet rs,String column) throws SQLException {
        return rs.getObject(column,UUID.class);
    }

    private static Instant instant(ResultSet rs,String column) throws SQLException {
        var value=rs.getTimestamp(column);
        return value==null?null:value.toInstant();
    }

    private static Map<String,Object> fields(Object... kv) {
        var result=new LinkedHashMap<String,Object>();
        for (int i=0;i<kv.length;i+=2) result.put((String)kv[i],kv[i+1]);
        return result;
    }

    public record DashboardSnapshot(List<Map<String,Object>> classrooms,
                                    List<Map<String,Object>> students,
                                    List<Map<String,Object>> enrollments,
                                    List<Map<String,Object>> sessions,
                                    List<Map<String,Object>> sessionParticipants,
                                    List<Map<String,Object>> scoreEvents,
                                    List<ActivityService.ActivityView> activities) {}
}
