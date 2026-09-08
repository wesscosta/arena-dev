package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.poll.PollService;
import br.com.arenadev.poll.PollStatus;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.stage.LiveStageType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class PollIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_poll_test")
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
    @Autowired private LiveStageService liveStageService;

    @Test
    void protectsDistributionUntilRevealAndActivatesTheSharedStage() {
        Scenario scenario = scenario(2);
        PollService.StateView created = pollService.create(
                scenario.sessionId(),
                new PollService.CreateCommand("Qual linguagem?", List.of("Java", "Python"), false)
        );

        assertThat(created.round().status()).isEqualTo(PollStatus.OPEN);
        assertThat(liveStageService.state(scenario.sessionId()).primary().type()).isEqualTo(LiveStageType.POLL);

        UUID optionId = created.round().options().getFirst().id();
        pollService.vote(scenario.sessionId(), scenario.participants().getFirst().getId(), optionId);

        PollService.StateView teacher = pollService.state(scenario.sessionId());
        PollService.StateView hidden = pollService.publicState(scenario.sessionId());
        assertThat(teacher.round().options().getFirst().voteCount()).isEqualTo(1);
        assertThat(hidden.round().totalVotes()).isEqualTo(1);
        assertThat(hidden.round().publicResultsVisible()).isFalse();
        assertThat(hidden.round().options()).allSatisfy(option -> {
            assertThat(option.voteCount()).isNull();
            assertThat(option.percentage()).isNull();
        });

        PollService.StateView revealed = pollService.reveal(scenario.sessionId(), created.round().id());
        assertThat(revealed.round().status()).isEqualTo(PollStatus.REVEALED);
        assertThat(pollService.publicState(scenario.sessionId()).round().options().getFirst().voteCount()).isEqualTo(1);
    }

    @Test
    void recordsAtMostOneChoicePerParticipantAndKeepsSameChoiceIdempotent() {
        Scenario scenario = scenario(1);
        PollService.StateView created = pollService.create(
                scenario.sessionId(),
                new PollService.CreateCommand("Escolha", List.of("A", "B"), true)
        );
        UUID participantId = scenario.participants().getFirst().getId();
        UUID first = created.round().options().get(0).id();
        UUID second = created.round().options().get(1).id();

        PollService.ParticipantStateView firstVote = pollService.vote(scenario.sessionId(), participantId, first);
        PollService.ParticipantStateView duplicate = pollService.vote(scenario.sessionId(), participantId, first);
        assertThat(firstVote.selectedOptionId()).isEqualTo(first);
        assertThat(duplicate.selectedOptionId()).isEqualTo(first);
        assertThat(pollService.state(scenario.sessionId()).round().totalVotes()).isEqualTo(1);

        assertThatThrownBy(() -> pollService.vote(scenario.sessionId(), participantId, second))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("já foi registrado");
    }

    @Test
    void closeStopsVotingAndSessionFinishClosesOpenPoll() {
        Scenario firstScenario = scenario(1);
        PollService.StateView created = pollService.create(
                firstScenario.sessionId(),
                new PollService.CreateCommand("Encerrar?", List.of("Sim", "Não"), true)
        );
        pollService.close(firstScenario.sessionId(), created.round().id());
        assertThatThrownBy(() -> pollService.vote(
                firstScenario.sessionId(),
                firstScenario.participants().getFirst().getId(),
                created.round().options().getFirst().id()
        )).isInstanceOf(IllegalArgumentException.class);

        Scenario secondScenario = scenario(1);
        pollService.create(secondScenario.sessionId(), new PollService.CreateCommand("Fim da aula", List.of("1", "2"), true));
        sessionService.finish(secondScenario.sessionId());
        assertThat(pollService.state(secondScenario.sessionId()).round().status()).isEqualTo(PollStatus.CLOSED);
    }

    private Scenario scenario(int count) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Poll " + suffix, "PL" + suffix);
        java.util.ArrayList<UUID> studentIds = new java.util.ArrayList<>();
        for (int index = 1; index <= count; index++) {
            var student = studentService.create("PL-" + suffix + "-" + index, "Aluno Poll " + index + " " + suffix, null);
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }
        var session = sessionService.start(classroom.id(), "Aula Poll", Set.copyOf(studentIds));
        return new Scenario(session.id(), participantRepository.findBySessionIdOrderByStudentNameAsc(session.id()));
    }

    private record Scenario(UUID sessionId, List<SessionParticipant> participants) {}
}
