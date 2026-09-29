package br.com.arenadev.journey;

import br.com.arenadev.study.JourneyStudyController;
import br.com.arenadev.study.JourneyStudyService;
import br.com.arenadev.study.StudyPrincipal;
import br.com.arenadev.study.StudyPrincipalResolver;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JourneyStudyControllerTest {
    @Test
    void resolvesStableStudyPrincipalWithoutJoinCode() {
        JourneyStudyService service = mock(JourneyStudyService.class);
        StudyPrincipalResolver resolver = mock(StudyPrincipalResolver.class);
        StudyPrincipal principal = new StudyPrincipal(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), StudyPrincipal.Role.STUDENT);
        when(resolver.resolve("study-token")).thenReturn(principal);
        when(service.list(principal)).thenReturn(List.of());

        JourneyStudyController controller = new JourneyStudyController(service, resolver);
        assertThat(controller.list("study-token")).isEmpty();

        verify(resolver).resolve("study-token");
        verify(service).list(principal);
    }

    @Test
    void contentCommandsUseJourneyAndContentIdentifiers() {
        JourneyStudyService service = mock(JourneyStudyService.class);
        StudyPrincipalResolver resolver = mock(StudyPrincipalResolver.class);
        StudyPrincipal principal = new StudyPrincipal(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), StudyPrincipal.Role.STUDENT);
        UUID journeyId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        when(resolver.resolve("study-token")).thenReturn(principal);

        JourneyStudyController controller = new JourneyStudyController(service, resolver);
        controller.start(journeyId, contentId, "study-token");
        controller.complete(journeyId, contentId, "study-token");

        verify(service).start(journeyId, contentId, principal);
        verify(service).complete(journeyId, contentId, principal);
    }
}
