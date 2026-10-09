package br.com.arenadev.learning.loop;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.interaction.*;
import br.com.arenadev.learning.*;
import br.com.arenadev.learning.clinic.LearningErrorClinicService;
import br.com.arenadev.learning.overview.SessionLearningOverviewService;
import br.com.arenadev.sessionevent.SessionEventService;
import br.com.arenadev.sessionevent.SessionEventType;
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
    @Autowired SessionLearningOverviewService overview;
    @Autowired LearningErrorClinicService clinic;
    @Autowired SessionEventService audit;

    @Test
    void requiresEvaluatedEvidenceAndPreservesTwoRunsWithComparableParticipants() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classView = classrooms.create("Learning Cycle " + suffix, "LC" + suffix);
        var person = students.create("LC-" + suffix, "Aluna Cycle " + suffix, null);
        classrooms.enroll(classView.id(), person.id());
        var session = sessions.start(classView.id(), "Aula de SQL", Set.of(person.id()));
        var participant = participants.findBySessionIdOrderByStudentNameAsc(session.id()).getFirst();
        var emptyOverview = overview.get(session.id());
        assertThat(emptyOverview.presentNow()).isEqualTo(1);
        assertThat(emptyOverview.absentNow()).isZero();
        assertThat(emptyOverview.cycles()).isZero();
        assertThat(emptyOverview.rows()).isEmpty();
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
        var pendingOverview = overview.get(session.id());
        assertThat(pendingOverview.cycles()).isEqualTo(1);
        assertThat(pendingOverview.verifiedCycles()).isZero();
        assertThat(pendingOverview.rows().getFirst().comparison()).isNull();
        assertThat(pendingOverview.rows().getFirst().learningTargetTitle()).isEqualTo("WHERE");
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
        var verifiedOverview = overview.get(session.id());
        assertThat(verifiedOverview.verifiedCycles()).isEqualTo(1);
        assertThat(verifiedOverview.rows().getFirst().comparison().paired()).isEqualTo(1);
        assertThat(verifiedOverview.rows().getFirst().comparison().transitions().incorrectToCorrect()).isEqualTo(1);
        assertThat(verifiedOverview.rows().getFirst().interventionNote())
                .isEqualTo("Explicou WHERE por exemplos.");
        assertThat(verifiedOverview.disclaimer()).contains("não demonstram domínio consolidado");
        assertThatThrownBy(() -> cycles.verify(session.id(), diagnosed.id(), after.getId()))
                .isInstanceOf(IllegalArgumentException.class);
        var otherClass = classrooms.create("Outra turma " + suffix, "OT" + suffix);
        var otherSession = sessions.start(otherClass.id(), "Aula de outra turma", Set.of());
        assertThatThrownBy(() -> cycles.comparison(otherSession.id(), diagnosed.id()))
                .isInstanceOf(RuntimeException.class);
        assertThat(cycles.list(otherSession.id())).isEmpty();
        assertThat(overview.get(otherSession.id()).cycles()).isZero();
        assertThat(overview.get(otherSession.id()).rows()).isEmpty();
        assertThatThrownBy(() -> overview.get(UUID.randomUUID()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void peerInstructionRecordsStrategyAndBlocksPreviouslyRevealedAnswers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classrooms.create("Peer Instruction " + suffix, "PI" + suffix);
        var student = students.create("PI-" + suffix, "Estudante pares " + suffix, null);
        var peer = students.create("PI-PAIR-" + suffix, "Colega pares " + suffix, null);
        classrooms.enroll(classroom.id(), student.id());
        classrooms.enroll(classroom.id(), peer.id());
        var session = sessions.start(classroom.id(), "Discussão em pares", Set.of(student.id(), peer.id()));
        var members = participants.findBySessionIdOrderByStudentNameAsc(session.id());
        var participant = members.stream().filter(p -> p.getStudent().getId().equals(student.id())).findFirst().orElseThrow();
        var peerParticipant = members.stream().filter(p -> p.getStudent().getId().equals(peer.id())).findFirst().orElseThrow();
        var target = targets.save(new LearningTarget("Filtrar registros", LearningTargetType.COMPETENCY, null));
        InteractionDefinition definition = new InteractionDefinition(
                "Onde fica a condição de filtragem?", InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER, InteractionPresentationMode.DEFAULT,
                target, true, null, new Provenance(ProvenanceOrigin.TEACHER, "lesson:peer", null,
                null, Instant.now()));
        definition.addOption("a", "WHERE", 0, null);
        definition.addOption("b", "ORDER BY", 1, null);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");
        definition.configureEvaluation("{\"correctOptionKeys\":[\"a\"]}");
        definition.activate();
        definition = definitions.saveAndFlush(definition);

        var before = createRun(session.id(), definition, 1);
        responses.submit(before.getId(), peerParticipant.getId(), "{\"selectedOptionKeys\":[\"a\"]}");
        finishRun(before, participant.getId(), "b");
        var cycle = cycles.diagnose(session.id(), before.getId());
        assertThat(cycle.baselineResultsRevealed()).isFalse();
        var intervention = cycles.intervene(session.id(), cycle.id(),
                "Pares discutiram as alternativas, sem revelar o gabarito.", InterventionType.PEER_DISCUSSION);
        assertThat(intervention.interventionType()).isEqualTo(InterventionType.PEER_DISCUSSION);
        assertThat(cycles.list(session.id()).getFirst().interventionType())
                .isEqualTo(InterventionType.PEER_DISCUSSION);

        var after = createRun(session.id(), definition, 2);
        responses.submit(after.getId(), peerParticipant.getId(), "{\"selectedOptionKeys\":[\"a\"]}");
        finishRun(after, participant.getId(), "a");
        var verified = cycles.verify(session.id(), cycle.id(), after.getId());
        assertThat(verified.interventionType()).isEqualTo(InterventionType.PEER_DISCUSSION);
        assertThat(verified.baselineResponseCount()).isEqualTo(2);
        assertThat(cycles.comparison(session.id(), cycle.id()).transitions().incorrectToCorrect()).isEqualTo(1);

        var revealed = createRun(session.id(), definition, 3);
        responses.submit(revealed.getId(), peerParticipant.getId(), "{\"selectedOptionKeys\":[\"b\"]}");
        finishRun(revealed, participant.getId(), "b", true);
        var exposedCycle = cycles.diagnose(session.id(), revealed.getId());
        assertThat(exposedCycle.baselineResultsRevealed()).isTrue();
        assertThatThrownBy(() -> cycles.intervene(session.id(), exposedCycle.id(),
                "Não deve ser permitido", InterventionType.PEER_DISCUSSION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sem revelar a correção");
        assertThat(cycles.list(session.id()).getFirst().status())
                .isEqualTo(LearningCycleStatus.DIAGNOSED);
        var single = createRun(session.id(), definition, 4);
        finishRun(single, participant.getId(), "b");
        var loneCycle = cycles.diagnose(session.id(), single.getId());
        assertThat(loneCycle.baselineResponseCount()).isEqualTo(1);
        assertThatThrownBy(() -> cycles.intervene(session.id(), loneCycle.id(),
                "Discussão inviável", InterventionType.PEER_DISCUSSION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duas respostas individuais");
        // A traditional feedback cycle remains possible after revealing correctness.
        assertThat(cycles.intervene(session.id(), exposedCycle.id(), "Revisão explícita.",
                InterventionType.EXPLANATION).interventionType()).isEqualTo(InterventionType.EXPLANATION);
    }

    @Test
    void errorClinicUsesObservedIncorrectChoicesAndPreservesAppendOnlyTeacherHistory() {
        String suffix=UUID.randomUUID().toString().substring(0,8).toUpperCase();
        var classroom=classrooms.create("Clínica de Erro " + suffix, "CE"+suffix);
        var student=students.create("CE-"+suffix,"Aluna Clínica",null);
        classrooms.enroll(classroom.id(),student.id());
        var session=sessions.start(classroom.id(),"Análise de erros",Set.of(student.id()));
        var participant=participants.findBySessionIdOrderByStudentNameAsc(session.id()).getFirst();
        var target=targets.save(new LearningTarget("Filtros",LearningTargetType.COMPETENCY,null));
        InteractionDefinition definition=new InteractionDefinition(
                "Qual cláusula filtra linhas?",InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,InteractionPresentationMode.DEFAULT,
                target,true,null,new Provenance(ProvenanceOrigin.TEACHER,"clinic-test",null,null,Instant.now()));
        definition.addOption("a","WHERE",0,null);
        definition.addOption("b","ORDER BY",1,null);
        definition.addOption("c","GROUP BY",2,null);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");
        definition.configureEvaluation("{\"correctOptionKeys\":[\"a\"]}");
        definition.activate();
        definition=definitions.saveAndFlush(definition);
        var run=createRun(session.id(),definition,1);
        assertThatThrownBy(()->clinic.read(session.id(),run.getId()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Encerre");
        finishRun(run,participant.getId(),"b");
        var initial=clinic.read(session.id(),run.getId());
        assertThat(initial.responseCount()).isEqualTo(1);
        assertThat(initial.options()).extracting("key").containsExactly("a","b","c");
        assertThat(initial.options().get(1).count()).isEqualTo(1);
        assertThat(initial.options().get(1).incorrect()).isTrue();
        assertThat(initial.options().get(0).incorrect()).isFalse();
        UUID command=UUID.randomUUID();
        assertThatThrownBy(()->clinic.annotate(session.id(),run.getId(),UUID.randomUUID(),"a","Não é erro"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->clinic.annotate(session.id(),run.getId(),UUID.randomUUID(),"c","Sem votos"))
                .isInstanceOf(IllegalArgumentException.class);
        var saved=clinic.annotate(session.id(),run.getId(),command,"b","Retomar diferença entre filtro e ordenação.");
        assertThat(saved.notes()).hasSize(1);
        assertThat(clinic.annotate(session.id(),run.getId(),command,"b", "Retomar diferença entre filtro e ordenação.").notes())
                .hasSize(1);
        assertThatThrownBy(()->clinic.annotate(session.id(),run.getId(),command,"b", "Conteúdo diferente"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        var updated=clinic.annotate(session.id(),run.getId(),UUID.randomUUID(),"b","Novo exemplo contrastivo.");
        assertThat(updated.notes()).hasSize(2);
        assertThat(clinic.read(session.id(),run.getId()).notes()).hasSize(2);
        assertThat(audit.listBySession(session.id()).stream().map(e->e.eventType()))
                .contains(SessionEventType.ERROR_CLINIC_NOTE_ADDED);
        var otherClass=classrooms.create("Outra Clínica "+suffix,"OC"+suffix);
        var other=sessions.start(otherClass.id(),"Outra aula",Set.of());
        assertThatThrownBy(()->clinic.read(other.id(),run.getId()))
                .isInstanceOf(br.com.arenadev.shared.ResourceNotFoundException.class);
        assertThatThrownBy(()->clinic.annotate(other.id(),run.getId(),UUID.randomUUID(),"b","Não autorizada"))
                .isInstanceOf(br.com.arenadev.shared.ResourceNotFoundException.class);
    }

    private InteractionRun createRun(UUID sessionId, InteractionDefinition definition, int seq) {
        InteractionRun run = new InteractionRun(sessionRepository.findById(sessionId).orElseThrow(), definition, seq);
        run.open(Instant.now());
        return runs.saveAndFlush(run);
    }

    private void finishRun(InteractionRun run, UUID participantId, String key) {
        finishRun(run, participantId, key, false);
    }

    private void finishRun(InteractionRun run, UUID participantId, String key, boolean reveal) {
        responses.submit(run.getId(), participantId, "{\"selectedOptionKeys\":[\"" + key + "\"]}");
        run.lockResponses(Instant.now());
        runs.saveAndFlush(run);
        evaluations.evaluateRun(run.getId());
        if (reveal) run.revealResults(Instant.now());
        run.close(Instant.now());
        runs.saveAndFlush(run);
    }
}
