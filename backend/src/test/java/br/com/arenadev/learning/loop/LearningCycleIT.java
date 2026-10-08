package br.com.arenadev.learning.loop;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.interaction.*;
import br.com.arenadev.learning.*;
import br.com.arenadev.session.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class LearningCycleIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_learning_cycle_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void db(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired ClassroomService classrooms;
    @Autowired StudentService students;
    @Autowired SessionService sessions;
    @Autowired SessionParticipantRepository participants;
    @Autowired ClassSessionRepository sessionRepository;
    @Autowired LearningTargetRepository targets;
    @Autowired InteractionDefinitionRepository definitions;
    @Autowired InteractionRunRepository runs;
    @Autowired InteractionResponseService responses;
    @Autowired InteractionEvaluationService evaluations;
    @Autowired LearningCycleService cycles;

    @Test
    void requiresEvaluatedEvidenceAndPreservesTwoRunsWithComparableParticipants() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classView = classrooms.create("Learning Cycle " + suffix, "LC" + suffix);
        var person = students.create("LC-" + suffix, "Aluna Cycle " + suffix, null);
        classrooms.enroll(classView.id(), person.id());
        var session = sessions.start(classView.id(), "Aula de SQL", Set.of(person.id()));
        var participant = participants.findBySessionIdOrderByStudentNameAsc(session.id()).getFirst();
        var target = targets.save(new LearningTarget("WHERE", LearningTargetType.COMPETENCY, null));
        InteractionDefinition definition = new InteractionDefinition(
                "Qual expressão filtra registros?", InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER, InteractionPresentationMode.DEFAULT,
                target, true, null, new Provenance(ProvenanceOrigin.TEACHER, "lesson:loop", null,
                null, Instant.now()));
        definition.addOption("a", "WHERE", 0, null);
        definition.addOption("b", "GROUP BY", 1, null);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");
        definition.configureEvaluation("{\"correctOptionKeys\":[\"a\"]}");
        definition.activate();
        definition = definitions.saveAndFlush(definition);
        InteractionRun before = createRun(session.id(), definition, 1);
        assertThatThrownBy(() -> cycles.diagnose(session.id(), before.getId()))
                .isInstanceOf(IllegalArgumentException.class);
        finishRun(before, participant.getId(), "b");
        var diagnosed = cycles.diagnose(session.id(), before.getId());
        assertThat(diagnosed.status()).isEqualTo(LearningCycleStatus.DIAGNOSED);
        assertThatThrownBy(() -> cycles.diagnose(session.id(), before.getId()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cycles.comparison(session.id(), diagnosed.id()))
                .isInstanceOf(IllegalArgumentException.class);
        cycles.intervene(session.id(), diagnosed.id(), "Explicou WHERE por exemplos.");
        InteractionRun after = createRun(session.id(), definition, 2);
        finishRun(after, participant.getId(), "a");
        var verified = cycles.verify(session.id(), diagnosed.id(), after.getId());
        assertThat(verified.status()).isEqualTo(LearningCycleStatus.VERIFIED);
        var comparison = cycles.comparison(session.id(), diagnosed.id());
        assertThat(comparison.paired()).isEqualTo(1);
        assertThat(comparison.transitions().incorrectToCorrect()).isEqualTo(1);
        assertThat(comparison.baseline().responses()).isEqualTo(1);
        assertThat(comparison.followup().responses()).isEqualTo(1);
        assertThatThrownBy(() -> cycles.verify(session.id(), diagnosed.id(), after.getId()))
                .isInstanceOf(IllegalArgumentException.class);
        var otherClass = classrooms.create("Outra turma " + suffix, "OT" + suffix);
        var otherSession = sessions.start(otherClass.id(), "Aula de outra turma", Set.of());
        assertThatThrownBy(() -> cycles.comparison(otherSession.id(), diagnosed.id()))
                .isInstanceOf(RuntimeException.class);
        assertThat(cycles.list(otherSession.id())).isEmpty();
    }

    private InteractionRun createRun(UUID sessionId, InteractionDefinition definition, int seq) {
        InteractionRun run = new InteractionRun(sessionRepository.findById(sessionId).orElseThrow(), definition, seq);
        run.open(Instant.now());
        return runs.saveAndFlush(run);
    }

    private void finishRun(InteractionRun run, UUID participantId, String key) {
        responses.submit(run.getId(), participantId, "{\"selectedOptionKeys\":[\"" + key + "\"]}");
        run.lockResponses(Instant.now());
        runs.saveAndFlush(run);
        evaluations.evaluateRun(run.getId());
        run.close(Instant.now());
        runs.saveAndFlush(run);
    }
}
