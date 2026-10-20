package br.com.arenadev.study;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.content.LearningResourceFormat;
import br.com.arenadev.content.LearningResourceService;
import br.com.arenadev.content.LearningResourceSourceType;
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

/** v0.11.0-rc.6: content is protected when the Journey or its material forbids copying. */
@SpringBootTest
class ContentCopyProtectionIT {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ContentCopyProtectionIT.class);
    }

    @Autowired ClassroomService classrooms;
    @Autowired LearningResourceService resources;
    @Autowired JourneyService journeys;
    @Autowired JourneyStudyService study;

    @Test
    void copyIsAllowedUntilTheJourneyOrTheMaterialForbidsIt() {
        UUID classroomId = classroom();
        var material = library(null);
        var journey = journeys.create(input(classroomId, material.id(), null));
        UUID contentId = journey.stages().getFirst().id();
        assertThat(journey.copyProtected()).isFalse();
        assertThat(study.previewContent(journey.id(), contentId).copyProtected()).isFalse();

        // Draft edits may rebuild stages, so read the content id from each result.
        var protectedJourney = journeys.update(journey.id(), input(classroomId, material.id(), true));
        assertThat(protectedJourney.copyProtected()).isTrue();
        UUID protectedContentId = protectedJourney.stages().getFirst().id();
        assertThat(study.previewContent(journey.id(), protectedContentId).copyProtected()).isTrue();

        // Omitting the setting on a later edit keeps it.
        assertThat(journeys.update(journey.id(), input(classroomId, material.id(), null)).copyProtected()).isTrue();
    }

    @Test
    void aProtectedMaterialStaysProtectedInAJourneyThatAllowsCopying() {
        UUID classroomId = classroom();
        var material = library(true);
        assertThat(material.copyProtected()).isTrue();
        var journey = journeys.create(input(classroomId, material.id(), false));
        UUID contentId = journey.stages().getFirst().id();

        assertThat(journey.copyProtected()).isFalse();
        assertThat(study.previewContent(journey.id(), contentId).copyProtected()).isTrue();

        resources.updateLibrary(material.id(), libraryInput(false));
        assertThat(study.previewContent(journey.id(), contentId).copyProtected()).isFalse();
    }

    private UUID classroom() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return classrooms.create("Cópia " + suffix, "CP" + suffix).id();
    }

    private LearningResourceService.ResourceView library(Boolean copyProtected) {
        return resources.createLibrary(libraryInput(copyProtected));
    }

    private static LearningResourceService.LibraryResourceInput libraryInput(Boolean copyProtected) {
        return new LearningResourceService.LibraryResourceInput(
                "SQL", "Consultas", "# SQL\n\n```sql\nselect 1;\n```", LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, null, "Banco de Dados", List.of("SQL"), "pt-BR",
                copyProtected);
    }

    private static JourneyService.JourneyInput input(UUID classroomId, UUID materialId, Boolean copyProtected) {
        return new JourneyService.JourneyInput(classroomId, "Jornada SQL", null, List.of(new JourneyService.StageInput(
                null, "Consultas", null, null, JourneyUnlockRule.IMMEDIATE, JourneyCompletionRule.MANUAL,
                null, "Fundamentos", JourneyItemType.CONTENT, materialId)), copyProtected);
    }
}
