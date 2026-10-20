package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentAnonymizationService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.scoring.ScoreSource;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** v0.11.0-rc.5: removing a student drops personal data and keeps the class history. */
@SpringBootTest
class StudentAnonymizationIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, history.class);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionJoinService joinService;
    @Autowired private ScoreEventService scoreEventService;
    @Autowired private StudentAnonymizationService anonymization;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void removesPersonalDataButKeepsTheClassHistory() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma LGPD " + suffix, "LG" + suffix);
        var student = studentService.create("LG-" + suffix, "Joana Ribeiro " + suffix, "Jo");
        var classmate = studentService.create("LG2-" + suffix, "Paulo Lima " + suffix, null);
        classroomService.enroll(classroom.id(), student.id());
        classroomService.enroll(classroom.id(), classmate.id());
        var session = sessionService.start(classroom.id(), "Aula LGPD", Set.of(student.id(), classmate.id()));
        scoreEventService.create(new ScoreEventService.CreateScoreEvent(
                classroom.id(), student.id(), session.id(), 30, ScoreCategory.BONUS, "Participação", ScoreSource.ARENA, null, null));
        scoreEventService.create(new ScoreEventService.CreateScoreEvent(
                classroom.id(), classmate.id(), session.id(), 20, ScoreCategory.BONUS, "Participação", ScoreSource.ARENA, null, null));
        String code = joinService.ensureCode(session.id()).code();
        var joined = joinService.join(code, "LG-" + suffix, true);
        assertThat(joined.deviceToken()).isNotNull();
        Integer classXpBefore = classXp(classroom.id());

        assertThatThrownBy(() -> anonymization.anonymize(student.id(), "Outro Nome"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(studentName(student.id())).isEqualTo("Joana Ribeiro " + suffix);

        var removed = anonymization.anonymize(student.id(), "joana ribeiro " + suffix);

        assertThat(removed.anonymized()).isTrue();
        assertThat(removed.active()).isFalse();
        assertThat(removed.registration()).isNull();
        assertThat(removed.nickname()).isNull();
        assertThat(removed.name()).startsWith("Aluno removido ").doesNotContain("Joana");
        assertThat(jdbc.queryForObject(
                "select count(*) from enrollments where student_id = ? and preferred_name is not null",
                Integer.class, student.id())).isZero();
        assertThat(jdbc.queryForObject("""
                select count(*) from enrollment_device_claims
                where enrollment_id in (select id from enrollments where student_id = ?)
                """, Integer.class, student.id())).isZero();
        assertThat(jdbc.queryForObject(
                "select count(*) from session_participants where student_id = ? and access_token_hash is not null",
                Integer.class, student.id())).isZero();
        assertThat(classXp(classroom.id())).isEqualTo(classXpBefore).isEqualTo(50);
        assertThat(studentName(classmate.id())).isEqualTo("Paulo Lima " + suffix);

        // Idempotent, and the old registration no longer identifies anyone.
        assertThat(anonymization.anonymize(student.id(), "irrelevante").name()).isEqualTo(removed.name());
        assertThatThrownBy(() -> joinService.join(code, "LG-" + suffix, false))
                .isInstanceOf(SessionJoinService.UnknownParticipantIdentityException.class);
        assertThatThrownBy(() -> studentService.update(student.id(), "LG-" + suffix, "Joana", null, true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private Integer classXp(UUID classroomId) {
        return jdbc.queryForObject(
                "select coalesce(sum(points), 0) from score_events where classroom_id = ?", Integer.class, classroomId);
    }

    private String studentName(UUID studentId) {
        return jdbc.queryForObject("select name from students where id = ?", String.class, studentId);
    }
}
