package br.com.arenadev.interaction;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class InteractionRunIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_interaction_run_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private InteractionRunRepository runRepository;

    @Autowired
    private InteractionDefinitionRepository definitionRepository;

    @Autowired
    private ClassSessionRepository sessionRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @BeforeEach
    void cleanDatabase() {
        runRepository.deleteAll();
        definitionRepository.deleteAll();
        sessionRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void persistsIndependentResponseLockAndResultReveal() {
        Fixture fixture = fixture();
        InteractionRun run = runRepository.save(
                new InteractionRun(fixture.session(), fixture.definition(), 1)
        );

        Instant opened = Instant.parse("2026-10-07T02:00:00Z");
        run.open(opened);
        run.revealResults(opened.plusSeconds(5));
        runRepository.saveAndFlush(run);

        InteractionRun revealed = runRepository.findById(run.getId()).orElseThrow();
        assertThat(revealed.acceptsResponses()).isTrue();
        assertThat(revealed.resultsVisiblePublicly()).isTrue();

        revealed.lockResponses(opened.plusSeconds(10));
        runRepository.saveAndFlush(revealed);

        InteractionRun locked = runRepository.findById(run.getId()).orElseThrow();
        assertThat(locked.acceptsResponses()).isFalse();
        assertThat(locked.resultsVisiblePublicly()).isTrue();
    }

    @Test
    void databaseAllowsOnlyOneActiveInteractionPerSession() {
        Fixture fixture = fixture();
        Instant now = Instant.parse("2026-10-07T02:00:00Z");

        InteractionRun first = new InteractionRun(fixture.session(), fixture.definition(), 1);
        first.open(now);
        runRepository.saveAndFlush(first);

        InteractionRun second = new InteractionRun(fixture.session(), fixture.definition(), 2);
        second.open(now.plusSeconds(1));

        assertThatThrownBy(() -> runRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Fixture fixture() {
        Classroom classroom = classroomRepository.save(new Classroom("Turma", "TURMA-RUN"));
        ClassSession session = sessionRepository.save(new ClassSession(classroom, "Aula"));
        InteractionDefinition definition = definitionRepository.save(definition());
        return new Fixture(session, definition);
    }

    private static InteractionDefinition definition() {
        InteractionDefinition definition = new InteractionDefinition(
                "Prompt",
                InteractionResponseKind.TEXT,
                InteractionEvaluationMode.NONE,
                InteractionPresentationMode.DEFAULT,
                null,
                false,
                null,
                new Provenance(
                        ProvenanceOrigin.SYSTEM,
                        null,
                        null,
                        null,
                        Instant.parse("2026-10-07T02:00:00Z")
                )
        );
        definition.activate();
        return definition;
    }

    private record Fixture(ClassSession session, InteractionDefinition definition) {
    }
}
