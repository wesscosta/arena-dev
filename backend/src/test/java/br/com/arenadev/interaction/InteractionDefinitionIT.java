package br.com.arenadev.interaction;

import br.com.arenadev.learning.ContentRef;
import br.com.arenadev.learning.LearningTarget;
import br.com.arenadev.learning.LearningTargetRepository;
import br.com.arenadev.learning.LearningTargetType;
import br.com.arenadev.learning.Provenance;
import br.com.arenadev.learning.ProvenanceOrigin;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class InteractionDefinitionIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_interaction_definition_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private InteractionDefinitionRepository repository;

    @Autowired
    private LearningTargetRepository learningTargetRepository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
        learningTargetRepository.deleteAll();
    }

    @Test
    @Transactional
    void persistsDefinitionOptionsLearningTargetContentRefAndProvenance() {
        LearningTarget target = learningTargetRepository.save(
                new LearningTarget("LEFT JOIN", LearningTargetType.COMPETENCY, null)
        );

        InteractionDefinition definition = new InteractionDefinition(
                "Qual JOIN preserva todas as linhas da esquerda?",
                InteractionResponseKind.CHOICE,
                InteractionEvaluationMode.CORRECT_ANSWER,
                InteractionPresentationMode.DEFAULT,
                target,
                true,
                new ContentRef("LEARNING_RESOURCE", "resource-42", 4, "joins/left"),
                new Provenance(
                        ProvenanceOrigin.IMPORTED,
                        "activity-question:123",
                        null,
                        null,
                        Instant.parse("2026-10-07T02:00:00Z")
                )
        );
        definition.addOption("true", "Verdadeiro", 0, null);
        definition.addOption("false", "Falso", 1, null);
        definition.configureResponse("{\"minSelections\":1,\"maxSelections\":1}");
        definition.configureEvaluation("{\"correctOptionKeys\":[\"true\"]}");
        definition.activate();

        InteractionDefinition saved = repository.saveAndFlush(definition);
        InteractionDefinition loaded = repository.findById(saved.getId()).orElseThrow();

        assertThat(loaded.getLearningTarget().getId()).isEqualTo(target.getId());
        assertThat(loaded.getOptions()).extracting(InteractionOption::getOptionKey)
                .containsExactly("true", "false");
        assertThat(loaded.contentRef()).isEqualTo(
                new ContentRef("LEARNING_RESOURCE", "resource-42", 4, "joins/left")
        );
        assertThat(loaded.provenance().origin()).isEqualTo(ProvenanceOrigin.IMPORTED);
        assertThat(loaded.isProducesEvidence()).isTrue();
        assertThat(repository.findByLearningTargetIdAndStatusOrderByCreatedAtDesc(
                target.getId(),
                InteractionDefinitionStatus.ACTIVE
        )).hasSize(1);
    }
}
