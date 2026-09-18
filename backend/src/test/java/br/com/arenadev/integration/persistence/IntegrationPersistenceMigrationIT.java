package br.com.arenadev.integration.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class IntegrationPersistenceMigrationIT {
    @Container
    static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_v26_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @Test
    void migratesLegacyV25LinksWithoutLosingIdentity() {
        var dataSource = new DriverManagerDataSource(
                POSTGRESQL.getJdbcUrl(), POSTGRESQL.getUsername(), POSTGRESQL.getPassword()
        );

        Flyway.configure()
                .dataSource(dataSource)
                .target("25")
                .load()
                .migrate();

        var jdbc = new JdbcTemplate(dataSource);

        UUID classroomId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        UUID activityLinkId = UUID.randomUUID();
        UUID submissionLinkId = UUID.randomUUID();

        jdbc.update("insert into classrooms(id,name,code,active) values (?,?,?,true)",
                classroomId, "Turma V26", "V26");
        jdbc.update("insert into students(id,registration,name,active) values (?,?,?,true)",
                studentId, "2026-V26", "Aluno V26");
        jdbc.update("insert into enrollments(id,classroom_id,student_id,active) values (?,?,?,true)",
                enrollmentId, classroomId, studentId);
        jdbc.update("""
                insert into activities(id,classroom_id,title,points,on_time_bonus,resource_kind)
                values (?,?,?,0,0,'INTERNAL')
                """, activityId, classroomId, "Atividade V26");
        jdbc.update("""
                insert into activity_submissions(
                    id,activity_id,enrollment_id,status,source,attempt_number,started_at,submitted_at
                ) values (?,?,?,'SUBMITTED','TEAMS',1,now(),now())
                """, submissionId, activityId, enrollmentId);
        jdbc.update("""
                insert into activity_provider_links(
                    id,activity_id,provider,external_class_id,external_assignment_id,external_web_url
                ) values (?,?, 'TEAMS','team-class-01','assignment-01','https://example.test/assignment')
                """, activityLinkId, activityId);
        jdbc.update("""
                insert into submission_provider_links(
                    id,submission_id,provider,external_submission_id,external_user_id,sync_state
                ) values (?,?, 'TEAMS','submission-01','user-01','IMPORTED')
                """, submissionLinkId, submissionId);

        Flyway.configure()
                .dataSource(dataSource)
                .load()
                .migrate();

        assertThat(jdbc.queryForObject(
                "select version from flyway_schema_history where success order by installed_rank desc limit 1",
                String.class
        )).isEqualTo("26");

        assertThat(jdbc.queryForObject(
                "select provider from integration_connections where id='00000000-0000-0000-0000-000000000701'",
                String.class
        )).isEqualTo("MICROSOFT_TEAMS");

        assertThat(jdbc.queryForObject(
                "select source from activity_submissions where id=?",
                String.class, submissionId
        )).isEqualTo("EXTERNAL");

        assertThat(jdbc.queryForObject(
                "select external_activity_id from external_activity_links where activity_id=?",
                String.class, activityId
        )).isEqualTo("assignment-01");

        assertThat(jdbc.queryForObject(
                "select external_submission_id from external_submission_links where submission_id=?",
                String.class, submissionId
        )).isEqualTo("submission-01");

        assertThat(jdbc.queryForObject(
                "select count(*) from activity_provider_links where id=?",
                Integer.class, activityLinkId
        )).isEqualTo(1);

        assertThat(jdbc.queryForObject(
                "select count(*) from submission_provider_links where id=?",
                Integer.class, submissionLinkId
        )).isEqualTo(1);
    }
}
