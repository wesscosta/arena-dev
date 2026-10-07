package br.com.arenadev.interaction;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.poll.PollService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(properties = "app.learning-core.poll-shadow-enabled=true")
class PollInteractionShadowIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_poll_interaction_shadow_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private PollService pollService;
    @Autowired private PollInteractionShadowService shadowService;
    @Autowired private PollInteractionShadowLinkRepository linkRepository;
    @Autowired private InteractionResponseRepository responseRepository;

    @Test
    void automaticShadowMatchesLegacyPollAcrossVoteRevealAndClose() {
        Scenario scenario = scenario(2);
        PollService.StateView created = pollService.create(
                scenario.sessionId(),
                new PollService.CreateCommand(
                        "Qual linguagem?",
                        List.of("Java", "Python"),
                        false
                )
        );

        PollInteractionShadowLink createdLink = link(created.round().id());
        assertThat(createdLink.getRun().getStatus()).isEqualTo(InteractionRunStatus.ACTIVE);
        assertThat(createdLink.getRun().acceptsResponses()).isTrue();
        assertThat(createdLink.getRun().resultsVisiblePublicly()).isFalse();
        assertThat(createdLink.getDefinition().getEvaluationMode())
                .isEqualTo(InteractionEvaluationMode.NONE);
        assertThat(createdLink.getDefinition().isProducesEvidence()).isFalse();

        UUID firstOptionId = created.round().options().get(0).id();
        UUID secondOptionId = created.round().options().get(1).id();
        UUID firstParticipant = scenario.participants().get(0).getId();
        UUID secondParticipant = scenario.participants().get(1).getId();

        pollService.vote(scenario.sessionId(), firstParticipant, firstOptionId);
        pollService.vote(scenario.sessionId(), secondParticipant, secondOptionId);

        PollInteractionShadowLink votedLink = link(created.round().id());
        assertThat(responseRepository.findByRunIdOrderBySubmittedAtAsc(
                votedLink.getRun().getId()
        )).hasSize(2);

        PollInteractionShadowService.ShadowComparison beforeReveal =
                shadowService.compare(created.round().id());
        assertThat(beforeReveal.equivalent()).isTrue();
        assertThat(beforeReveal.mismatches()).isEmpty();
        assertThat(beforeReveal.legacy().responseCount()).isEqualTo(2);
        assertThat(beforeReveal.shadow().evaluation().evaluationCount()).isZero();
        assertThat(beforeReveal.shadow().evaluation().accuracy()).isNull();

        String firstKey = firstOptionId.toString();
        String secondKey = secondOptionId.toString();
        assertThat(beforeReveal.legacy().distribution())
                .containsEntry(firstKey, 1L)
                .containsEntry(secondKey, 1L);

        pollService.reveal(scenario.sessionId(), created.round().id());
        PollInteractionShadowLink revealedLink = link(created.round().id());
        assertThat(revealedLink.getRun().resultsVisiblePublicly()).isTrue();
        assertThat(revealedLink.getRun().acceptsResponses()).isTrue();

        pollService.close(scenario.sessionId(), created.round().id());
        PollInteractionShadowLink closedLink = link(created.round().id());
        assertThat(closedLink.getRun().getStatus()).isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(closedLink.getRun().acceptsResponses()).isFalse();

        assertThat(shadowService.compare(created.round().id()).equivalent()).isTrue();
    }

    @Test
    void liveResultsRevealShadowWhileVotesAreStillAccepted() {
        Scenario scenario = scenario(1);
        PollService.StateView created = pollService.create(
                scenario.sessionId(),
                new PollService.CreateCommand(
                        "Resultado ao vivo?",
                        List.of("Sim", "Não"),
                        true
                )
        );

        PollInteractionShadowLink link = link(created.round().id());

        assertThat(link.getRun().resultsVisiblePublicly()).isTrue();
        assertThat(link.getRun().acceptsResponses()).isTrue();
        assertThat(shadowService.compare(created.round().id()).equivalent()).isTrue();
    }

    private PollInteractionShadowLink link(UUID pollRoundId) {
        return linkRepository.findByPollRoundIdWithGraph(pollRoundId).orElseThrow();
    }

    private Scenario scenario(int count) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create(
                "Turma Poll Shadow " + suffix,
                "PS" + suffix
        );

        ArrayList<UUID> studentIds = new ArrayList<>();
        for (int index = 1; index <= count; index++) {
            var student = studentService.create(
                    "PS-" + suffix + "-" + index,
                    "Aluno Poll Shadow " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(
                classroom.id(),
                "Aula Poll Shadow",
                Set.copyOf(studentIds)
        );
        List<SessionParticipant> participants =
                participantRepository.findBySessionIdOrderByStudentNameAsc(session.id());

        return new Scenario(session.id(), participants);
    }

    private record Scenario(
            UUID sessionId,
            List<SessionParticipant> participants
    ) {}
}
