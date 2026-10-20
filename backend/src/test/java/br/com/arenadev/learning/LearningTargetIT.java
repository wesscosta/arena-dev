package br.com.arenadev.learning;

import br.com.arenadev.support.SharedPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LearningTargetIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, LearningTargetIT.class);
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
