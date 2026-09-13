package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class ClassroomHardDeleteIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_classroom_delete_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private ClassroomService classroomService;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void hardDeleteRequiresExactNameDeletesOwnedGraphAndPreservesStudent() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        ClassroomService.ClassroomView classroom =
                classroomService.create("Turma para excluir " + suffix, "DEL-" + suffix);

        UUID studentId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID participantId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID roundId = UUID.randomUUID();

        jdbc.update(
                "insert into students(id, registration, name) values (?, ?, ?)",
                studentId, "ST-" + suffix, "Aluno preservado " + suffix
        );
        jdbc.update(
                "insert into enrollments(id, classroom_id, student_id) values (?, ?, ?)",
                enrollmentId, classroom.id(), studentId
        );
        jdbc.update(
                "insert into enrollment_device_claims(id, enrollment_id, token_hash, expires_at) values (?, ?, ?, now() + interval '1 day')",
                UUID.randomUUID(), enrollmentId, "delete-" + suffix
        );
        jdbc.update(
                "insert into class_sessions(id, classroom_id, title, status, ended_at) values (?, ?, ?, 'FINISHED', now())",
                sessionId, classroom.id(), "Sessão encerrada"
        );
        jdbc.update(
                "insert into session_participants(id, session_id, student_id) values (?, ?, ?)",
                participantId, sessionId, studentId
        );
        jdbc.update(
                "insert into session_timers(id, session_id, title, status, duration_seconds, remaining_seconds) values (?, ?, ?, 'FINISHED', 60, 0)",
                UUID.randomUUID(), sessionId, "Tempo"
        );
        jdbc.update(
                "insert into session_events(id, session_id, event_type, actor, summary) values (?, ?, 'SESSION_STARTED', 'SYSTEM', 'Evento')",
                UUID.randomUUID(), sessionId
        );
        jdbc.update(
                "insert into activities(id, classroom_id, title) values (?, ?, ?)",
                activityId, classroom.id(), "Atividade"
        );
        jdbc.update(
                "insert into activity_questions(id, activity_id, type, statement, difficulty, position, options_json, answer_json) values (?, ?, 'MULTIPLE_CHOICE', 'Questão', 'MEDIUM', 0, '[{\"id\":\"a\",\"text\":\"A\"}]', '\"a\"')",
                questionId, activityId
        );
        jdbc.update(
                "insert into quiz_rounds(id, session_id, question_id, status) values (?, ?, ?, 'CLOSED')",
                roundId, sessionId, questionId
        );
        jdbc.update(
                "insert into quiz_participant_answers(id, round_id, participant_id, answer_json) values (?, ?, ?, '\"a\"')",
                UUID.randomUUID(), roundId, participantId
        );
        jdbc.update(
                "insert into score_events(id, classroom_id, student_id, session_id, points, category, description, source) values (?, ?, ?, ?, 10, 'QUESTION', 'XP de teste', 'QUIZ')",
                UUID.randomUUID(), classroom.id(), studentId, sessionId
        );

        assertThatThrownBy(() -> classroomService.hardDelete(classroom.id(), "nome incorreto"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nome completo");

        classroomService.hardDelete(classroom.id(), classroom.name());

        assertThat(count("classrooms", "id", classroom.id())).isZero();
        assertThat(count("enrollments", "classroom_id", classroom.id())).isZero();
        assertThat(count("class_sessions", "classroom_id", classroom.id())).isZero();
        assertThat(count("activities", "classroom_id", classroom.id())).isZero();
        assertThat(count("score_events", "classroom_id", classroom.id())).isZero();
        assertThat(count("students", "id", studentId)).isEqualTo(1);
    }

    @Test
    void hardDeleteRefusesLiveSession() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        ClassroomService.ClassroomView classroom =
                classroomService.create("Turma ao vivo " + suffix, "LIVE-" + suffix);

        jdbc.update(
                "insert into class_sessions(id, classroom_id, title, status) values (?, ?, ?, 'ACTIVE')",
                UUID.randomUUID(), classroom.id(), "Sessão ao vivo"
        );

        assertThatThrownBy(() -> classroomService.hardDelete(classroom.id(), classroom.name()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sessão ativa");

        assertThat(count("classrooms", "id", classroom.id())).isEqualTo(1);
    }

    private int count(String table, String column, UUID id) {
        Integer value = jdbc.queryForObject(
                "select count(*) from " + table + " where " + column + " = ?",
                Integer.class,
                id
        );
        return value == null ? 0 : value;
    }
}
