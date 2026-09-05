package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.wordcloud.WordCloudService;
import br.com.arenadev.wordcloud.WordCloudStatus;
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
class WordCloudIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_word_cloud_test")
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
    private StudentService studentService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private WordCloudService wordCloudService;

    @Test
    void collectsHiddenAnswersThenRevealsNormalizedFrequency() {
        Scenario scenario = scenario(1);
        UUID participantId = scenario.participants().getFirst().getId();

        WordCloudService.StateView created = wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand(
                        "Qual conceito resume a aula?",
                        false,
                        3
                )
        );

        assertThat(created.round().status()).isEqualTo(WordCloudStatus.COLLECTING);
        assertThat(created.round().terms()).isEmpty();

        WordCloudService.ParticipantStateView participantState =
                wordCloudService.submit(
                        scenario.sessionId(),
                        participantId,
                        List.of("Java", "java!", "Programação")
                );

        assertThat(participantState.submittedWords())
                .containsExactly("Java", "Programação");
        assertThat(participantState.remainingWords()).isEqualTo(1);

        WordCloudService.StateView hidden = wordCloudService.state(scenario.sessionId());
        assertThat(hidden.round().participantCount()).isEqualTo(1);
        assertThat(hidden.round().submissionCount()).isEqualTo(2);
        assertThat(hidden.round().terms()).isEmpty();

        WordCloudService.StateView revealed = wordCloudService.reveal(
                scenario.sessionId(),
                created.round().id()
        );

        assertThat(revealed.round().status()).isEqualTo(WordCloudStatus.REVEALED);
        assertThat(revealed.round().terms())
                .extracting(WordCloudService.TermView::normalizedText)
                .containsExactly("java", "programacao");
    }

    @Test
    void mergesEquivalentWordsAcrossParticipantsInLiveMode() {
        Scenario scenario = scenario(2);

        WordCloudService.StateView created = wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand(
                        "Uma palavra sobre desenvolvimento de software",
                        true,
                        1
                )
        );

        wordCloudService.submit(
                scenario.sessionId(),
                scenario.participants().get(0).getId(),
                List.of("Programação")
        );
        wordCloudService.submit(
                scenario.sessionId(),
                scenario.participants().get(1).getId(),
                List.of("programacao!")
        );

        WordCloudService.StateView state = wordCloudService.state(scenario.sessionId());
        assertThat(state.round().id()).isEqualTo(created.round().id());
        assertThat(state.round().participantCount()).isEqualTo(2);
        assertThat(state.round().submissionCount()).isEqualTo(2);
        assertThat(state.round().terms()).hasSize(1);
        assertThat(state.round().terms().getFirst().normalizedText()).isEqualTo("programacao");
        assertThat(state.round().terms().getFirst().count()).isEqualTo(2);
    }

    @Test
    void enforcesParticipantWordLimitAndOnlyOneOpenRound() {
        Scenario scenario = scenario(1);
        UUID participantId = scenario.participants().getFirst().getId();

        wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand("Defina API", false, 2)
        );

        wordCloudService.submit(
                scenario.sessionId(),
                participantId,
                List.of("interface", "contrato")
        );

        assertThatThrownBy(() -> wordCloudService.submit(
                scenario.sessionId(),
                participantId,
                List.of("integração")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no máximo 2");

        assertThatThrownBy(() -> wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand("Outra rodada", true, 1)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Já existe uma rodada");
    }

    @Test
    void closesOpenRoundWhenClassSessionFinishes() {
        Scenario scenario = scenario(1);

        wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand("Fechamento", true, 1)
        );

        sessionService.finish(scenario.sessionId());

        WordCloudService.StateView state = wordCloudService.state(scenario.sessionId());
        assertThat(state.round().status()).isEqualTo(WordCloudStatus.CLOSED);
        assertThat(state.round().closedAt()).isNotNull();
    }

    private Scenario scenario(int studentCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create(
                "Turma Nuvem " + suffix,
                "WC" + suffix
        );

        java.util.ArrayList<UUID> studentIds = new java.util.ArrayList<>();
        for (int index = 1; index <= studentCount; index++) {
            var student = studentService.create(
                    "WC-" + suffix + "-" + index,
                    "Aluno Nuvem " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(
                classroom.id(),
                "Aula Nuvem",
                Set.copyOf(studentIds)
        );

        List<SessionParticipant> participants =
                participantRepository.findBySessionIdOrderByStudentNameAsc(
                        session.id()
                );

        return new Scenario(session.id(), participants);
    }

    private record Scenario(
            UUID sessionId,
            List<SessionParticipant> participants
    ) {
    }
}
