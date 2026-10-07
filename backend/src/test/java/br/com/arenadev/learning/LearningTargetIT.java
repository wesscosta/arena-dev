package br.com.arenadev.learning;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class LearningTargetIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_learning_target_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private LearningTargetRepository repository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void persistsHierarchyWithoutTurningLibrarySubjectIntoTaxonomy() {
        LearningTarget sql = repository.save(new LearningTarget("SQL", LearningTargetType.TOPIC, null));
        LearningTarget join = repository.save(new LearningTarget("JOIN", LearningTargetType.COMPETENCY, sql));

        LearningTarget persisted = repository.findById(join.getId()).orElseThrow();

        assertThat(persisted.getParent().getId()).isEqualTo(sql.getId());
        assertThat(repository.findByParentIdAndStatusOrderByTitleAsc(
                sql.getId(),
                LearningTargetStatus.ACTIVE
        )).extracting(LearningTarget::getTitle).containsExactly("JOIN");
    }
}
