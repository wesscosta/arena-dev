package br.com.arenadev.content;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.content.ingestion.*;
import br.com.arenadev.journey.JourneyItemType;
import br.com.arenadev.journey.JourneyRepository;
import br.com.arenadev.journey.JourneyStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
class ContentIngestionMaterializationIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_dev_test")
            .withUsername("arena_test")
            .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private JourneyDraftMaterializationService materialization;
    @Autowired private JourneyRepository journeys;
    @Autowired private LearningResourceRepository resources;
    @Autowired private ClassroomRepository classrooms;

    @BeforeEach
    void clean() {
        journeys.deleteAll();
        resources.deleteAll();
        classrooms.deleteAll();
    }

    @Test
    void materializesSectionsItemsAndLearningResourcesWithoutPublishing() {
        Classroom classroom = classrooms.save(new Classroom("Banco de Dados", "BD-CONTENT"));
        var draft = new ContentIngestionService.DraftView(
                "SQL Essencial",
                "Jornada gerada a partir de material existente.",
                ContentIngestionSource.MARKDOWN,
                "sql.md",
                List.of(
                        new ContentIngestionService.DraftSection(
                                "Fundamentos",
                                "Base conceitual",
                                List.of(
                                        new ContentIngestionService.DraftItem(
                                                "SELECT",
                                                "Consulta de dados",
                                                DraftItemType.CONTENT,
                                                "# SELECT\nUse SELECT para consultar dados.",
                                                null
                                        ),
                                        new ContentIngestionService.DraftItem(
                                                "Quiz de leitura",
                                                null,
                                                DraftItemType.QUIZ,
                                                null,
                                                null
                                        )
                                )
                        ),
                        new ContentIngestionService.DraftSection(
                                "Prática",
                                null,
                                List.of(
                                        new ContentIngestionService.DraftItem(
                                                "Documentação externa",
                                                null,
                                                DraftItemType.EXTERNAL_RESOURCE,
                                                null,
                                                "https://example.com/sql"
                                        )
                                )
                        )
                )
        );

        var view = materialization.materialize(
                new JourneyDraftMaterializationService.MaterializeRequest(classroom.getId(), draft)
        );

        assertThat(view.status()).isEqualTo(JourneyStatus.DRAFT);
        assertThat(view.stages()).hasSize(3);
        assertThat(view.stages()).extracting(stage -> stage.sectionTitle())
                .containsExactly("Fundamentos", "Fundamentos", "Prática");
        assertThat(view.stages()).extracting(stage -> stage.itemType())
                .containsOnly(JourneyItemType.CONTENT);
        assertThat(view.stages().getFirst().learningResourceId()).isNotNull();
        assertThat(view.stages().get(1).learningResourceId()).isNotNull();
        assertThat(view.stages().get(2).learningResourceId()).isNotNull();

        assertThat(resources.findByClassroomIdOrderByUpdatedAtDesc(classroom.getId())).hasSize(3);
    }
    @Test
    void materializesExtractedFileContentAsPlainTextWithFileProvenance() {
        Classroom classroom = classrooms.save(new Classroom("Fundamentos", "FILE-CONTENT"));
        var draft = new ContentIngestionService.DraftView(
                "Material importado",
                "Rascunho derivado de documento enviado pelo professor.",
                ContentIngestionSource.FILE,
                "apostila.pdf",
                List.of(new ContentIngestionService.DraftSection(
                        "Conteúdo",
                        null,
                        List.of(new ContentIngestionService.DraftItem(
                                "Introdução",
                                "Trecho extraído",
                                DraftItemType.CONTENT,
                                "Texto extraído do PDF.",
                                null
                        ))
                ))
        );

        var view = materialization.materialize(
                new JourneyDraftMaterializationService.MaterializeRequest(classroom.getId(), draft)
        );

        assertThat(view.status()).isEqualTo(JourneyStatus.DRAFT);
        var stored = resources.findByClassroomIdOrderByUpdatedAtDesc(classroom.getId());
        assertThat(stored).hasSize(1);
        assertThat(stored.getFirst().getFormat()).isEqualTo(LearningResourceFormat.PLAIN_TEXT);
        assertThat(stored.getFirst().getSourceType()).isEqualTo(LearningResourceSourceType.FILE);
        assertThat(stored.getFirst().getSourceLabel()).isEqualTo("apostila.pdf");
    }

}
