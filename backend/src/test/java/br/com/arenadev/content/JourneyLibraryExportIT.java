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

        var first = export.saveContentsToLibrary(journey.id());
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

    private static JourneyService.StageInput stage(String title, UUID resourceId) {
        return new JourneyService.StageInput(null, title, null, null, JourneyUnlockRule.IMMEDIATE,
                JourneyCompletionRule.MANUAL, null, "Módulo 1", JourneyItemType.CONTENT, resourceId);
    }
}
