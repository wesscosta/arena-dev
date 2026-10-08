package br.com.arenadev.interaction;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.learning.LearningEvidenceRepository;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.wordcloud.WordCloudService;
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
@SpringBootTest(
        properties = "app.learning-core.word-cloud-shadow-enabled=true"
)
class WordCloudInteractionShadowIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_word_cloud_interaction_shadow_test")
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
    @Autowired private WordCloudService wordCloudService;
    @Autowired private WordCloudInteractionShadowService shadowService;
    @Autowired private WordCloudInteractionShadowLinkRepository linkRepository;
    @Autowired private InteractionResponseRepository responseRepository;
    @Autowired private InteractionEvaluationRepository evaluationRepository;
    @Autowired private LearningEvidenceRepository evidenceRepository;
    @Autowired private InteractionShadowObservationRepository observationRepository;

    @Test
    void shadowPreservesParticipantListsAndNormalizedFrequency() {
        Scenario scenario = scenario(2);
        UUID firstParticipant = scenario.participants().get(0).getId();
        UUID secondParticipant = scenario.participants().get(1).getId();

        WordCloudService.StateView created = wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand(
                        "Quais conceitos ficaram da aula?",
                        false,
                        3
                )
        );

        WordCloudInteractionShadowLink link = link(created.round().id());
        assertThat(link.getRun().getStatus())
                .isEqualTo(InteractionRunStatus.ACTIVE);
        assertThat(link.getRun().acceptsResponses()).isTrue();
        assertThat(link.getRun().resultsVisiblePublicly()).isFalse();
        assertThat(link.getDefinition().getResponseKind())
                .isEqualTo(InteractionResponseKind.TEXT);
        assertThat(link.getDefinition().getPresentationMode())
                .isEqualTo(InteractionPresentationMode.WORD_CLOUD);
        assertThat(link.getDefinition().getEvaluationMode())
                .isEqualTo(InteractionEvaluationMode.NONE);
        assertThat(link.getDefinition().isProducesEvidence()).isFalse();

        wordCloudService.submit(
                scenario.sessionId(),
                firstParticipant,
                List.of("Java", "java!", "Programação")
        );
        wordCloudService.submit(
                scenario.sessionId(),
                firstParticipant,
                List.of("SQL")
        );
        wordCloudService.submit(
                scenario.sessionId(),
                secondParticipant,
                List.of("programacao!")
        );

        WordCloudInteractionShadowService.ShadowComparison comparison =
                shadowService.compare(created.round().id());

        assertThat(comparison.equivalent()).isTrue();
        assertThat(comparison.legacy().participantCount()).isEqualTo(2);
        assertThat(comparison.legacy().submissionCount()).isEqualTo(4);
        assertThat(comparison.legacy().termFrequency())
                .containsEntry("java", 1L)
                .containsEntry("programacao", 2L)
                .containsEntry("sql", 1L);
        assertThat(comparison.shadowTermFrequency())
                .isEqualTo(comparison.legacy().termFrequency());
        assertThat(comparison.shadow().participation().responseCount())
                .isEqualTo(2);
        assertThat(comparison.shadow().evaluation().evaluationCount())
                .isZero();
        assertThat(comparison.shadow().evaluation().accuracy()).isNull();

        InteractionResponse firstResponse = responseRepository
                .findByRunIdAndParticipantId(
                        link.getRun().getId(),
                        firstParticipant
                )
                .orElseThrow();
        assertThat(firstResponse.getRevision()).isEqualTo(2);

        wordCloudService.reveal(
                scenario.sessionId(),
                created.round().id()
        );

        WordCloudInteractionShadowLink revealed = link(created.round().id());
        assertThat(revealed.getRun().acceptsResponses()).isFalse();
        assertThat(revealed.getRun().resultsVisiblePublicly()).isTrue();
        assertThat(evaluationRepository.findByResponseRunIdOrderByEvaluatedAtAsc(
                revealed.getRun().getId()
        )).isEmpty();
        assertThat(evidenceRepository.count()).isZero();

        wordCloudService.close(
                scenario.sessionId(),
                created.round().id()
        );
        assertThat(link(created.round().id()).getRun().getStatus())
                .isEqualTo(InteractionRunStatus.CLOSED);
        assertThat(shadowService.compare(created.round().id()).equivalent())
                .isTrue();
        assertThat(observationRepository.findAll()).anyMatch(observation ->
                observation.getLegacyRoundId().equals(created.round().id())
                        && observation.terminal()
                        && observation.getStatus()
                        == InteractionShadowObservationStatus.EQUIVALENT
        );
        assertThat(evidenceRepository.count()).isZero();
    }

    @Test
    void liveRevealShowsResultsWithoutStoppingCollection() {
        Scenario scenario = scenario(1);

        WordCloudService.StateView created = wordCloudService.create(
                scenario.sessionId(),
                new WordCloudService.CreateCommand(
                        "Uma palavra sobre a aula",
                        true,
                        2
                )
        );

        WordCloudInteractionShadowLink link = link(created.round().id());
        assertThat(link.getRun().resultsVisiblePublicly()).isTrue();
        assertThat(link.getRun().acceptsResponses()).isTrue();

        wordCloudService.submit(
                scenario.sessionId(),
                scenario.participants().getFirst().getId(),
                List.of("SQL")
        );

        assertThat(shadowService.compare(created.round().id()).equivalent())
                .isTrue();
        assertThat(link(created.round().id()).getRun().acceptsResponses())
                .isTrue();
    }

    private WordCloudInteractionShadowLink link(UUID roundId) {
        return linkRepository.findByRoundIdWithGraph(roundId).orElseThrow();
    }

    private Scenario scenario(int studentCount) {
        String suffix =
                UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create(
                "Turma Nuvem Shadow " + suffix,
                "WCS" + suffix
        );

        ArrayList<UUID> studentIds = new ArrayList<>();
        for (int index = 1; index <= studentCount; index++) {
            var student = studentService.create(
                    "WCS-" + suffix + "-" + index,
                    "Aluno Nuvem Shadow " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(
                classroom.id(),
                "Aula Nuvem Shadow",
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
    ) {}
}
