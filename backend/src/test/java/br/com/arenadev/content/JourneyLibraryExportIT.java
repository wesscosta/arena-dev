package br.com.arenadev.content;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.journey.JourneyCompletionRule;
import br.com.arenadev.journey.JourneyItemType;
import br.com.arenadev.journey.JourneyService;
import br.com.arenadev.journey.JourneyUnlockRule;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** v0.11.0-rc.7: a classroom Journey's contents can be saved to the Library as copies. */
@SpringBootTest
class JourneyLibraryExportIT {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, JourneyLibraryExportIT.class);
    }

    @Autowired ClassroomService classrooms;
    @Autowired LearningResourceService resources;
    @Autowired JourneyService journeys;
    @Autowired JourneyLibraryExportService export;
    @Autowired LearningResourceRepository repository;

    @Test
    void savesEachClassroomContentOnceAndSkipsWhatIsAlreadyInTheLibrary() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Exportar " + suffix, "EX" + suffix).id();
        var classroomMaterial = resources.create(new LearningResourceService.ResourceInput(classroomId,
                "Variáveis " + suffix, "Tipos", "# Variáveis\n\n`x = 1`", LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, null, "Python", List.of("python"), "pt-BR"));
        var libraryMaterial = resources.createLibrary(new LearningResourceService.LibraryResourceInput(
                "SQL " + suffix, null, "# SQL", LearningResourceFormat.MARKDOWN, LearningResourceSourceType.MANUAL,
                null, null, null, List.of(), "pt-BR"));
        var journey = journeys.create(new JourneyService.JourneyInput(classroomId, "Jornada " + suffix, null, List.of(
                stage("Variáveis " + suffix, classroomMaterial.id()),
                stage("SQL " + suffix, libraryMaterial.id()),
                stage("Sem conteúdo", null)), true));

        var first = export.saveToLibrary(journey.id(), JourneyLibraryExportService.Scope.STAGES);
        assertThat(first.created()).isEqualTo(1);
        assertThat(first.alreadyInLibrary()).isEqualTo(1);
        assertThat(first.withoutContent()).isEqualTo(1);
        var copy = repository.findById(first.createdIds().getFirst()).orElseThrow();
        assertThat(copy.isLibraryVisible()).isTrue();
        assertThat(copy.getClassroom()).isNull();
        assertThat(copy.getBody()).contains("x = 1");
        assertThat(copy.isCopyProtected()).as("protected Journey keeps its copies protected").isTrue();
        assertThat(repository.findById(classroomMaterial.id()).orElseThrow().isLibraryVisible())
                .as("the classroom material itself is untouched").isFalse();

        var second = export.saveContentsToLibrary(journey.id());
        assertThat(second.created()).isZero();
        assertThat(second.alreadyInLibrary()).isEqualTo(2);
    }

    @Test
    void rc8SavesTheWholeJourneyAsOneMarkdownMaterialWithItsStructure() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classrooms.create("Inteira " + suffix, "IN" + suffix).id();
        var variables = resources.create(new LearningResourceService.ResourceInput(classroomId,
                "Variáveis", null, "# Variáveis\n\nGuardam valores.\n\n## Tipos\n\n```python\n# comentário\nx = 1\n```",
                LearningResourceFormat.MARKDOWN, LearningResourceSourceType.MANUAL, null, null, "Python", List.of("python"), "pt-BR"));
        var loops = resources.create(new LearningResourceService.ResourceInput(classroomId,
                "Laços", null, "Repetem blocos.", LearningResourceFormat.PLAIN_TEXT,
                LearningResourceSourceType.MANUAL, null, null, "Python", List.of("python"), "pt-BR"));
        var journey = journeys.create(new JourneyService.JourneyInput(classroomId, "Python " + suffix, "Do zero ao laço.", List.of(
                stage("Variáveis", variables.id(), "Fundamentos"),
                stage("Sem conteúdo", null, "Fundamentos"),
                stage("Laços", loops.id(), "Controle")), false));

        var first = export.saveToLibrary(journey.id(), JourneyLibraryExportService.Scope.JOURNEY);
        assertThat(first.created()).isEqualTo(1);
        assertThat(first.withoutContent()).isEqualTo(1);
        var material = repository.findById(first.createdIds().getFirst()).orElseThrow();
        assertThat(material.isLibraryVisible()).isTrue();
        assertThat(material.getTitle()).isEqualTo("Python " + suffix);
        assertThat(material.getSubject()).isEqualTo("Python");
        assertThat(material.getBody()).isEqualTo("""
                # Python %s

                Do zero ao laço.

                ## Fundamentos

                ### Variáveis

                Guardam valores.

                ##### Tipos

                ```python
                # comentário
                x = 1
                ```

                ## Controle

                ### Laços

                Repetem blocos.
                """.formatted(suffix).strip());
        assertThat(material.getOutlineJson()).contains("Fundamentos").contains("Laços");

        var second = export.saveToLibrary(journey.id(), JourneyLibraryExportService.Scope.JOURNEY);
        assertThat(second.created()).isZero();
        assertThat(second.alreadyInLibrary()).isEqualTo(1);
    }

    private static JourneyService.StageInput stage(String title, UUID resourceId) {
        return stage(title, resourceId, "Módulo 1");
    }

    private static JourneyService.StageInput stage(String title, UUID resourceId, String module) {
        return new JourneyService.StageInput(null, title, null, null, JourneyUnlockRule.IMMEDIATE,
                JourneyCompletionRule.MANUAL, null, module, JourneyItemType.CONTENT, resourceId);
    }
}
