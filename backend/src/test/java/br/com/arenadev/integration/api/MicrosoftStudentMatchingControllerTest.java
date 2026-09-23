package br.com.arenadev.integration.api;

import br.com.arenadev.integration.provider.microsoft.MicrosoftStudentMatchingPreviewService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MicrosoftStudentMatchingControllerTest {

    @Test
    void exposesPreviewResultWithoutTransformingClassification() {
        var service = mock(MicrosoftStudentMatchingPreviewService.class);
        var connectionId = UUID.randomUUID();
        var classroomLinkId = UUID.randomUUID();
        var classroomId = UUID.randomUUID();

        var result = new MicrosoftStudentMatchingPreviewService.PreviewResult(
                connectionId,
                classroomLinkId,
                classroomId,
                "class-1",
                List.of(),
                0, 0, 0, 0, 0, 0, 0
        );

        when(service.preview(connectionId, classroomLinkId)).thenReturn(result);

        var controller = new MicrosoftStudentMatchingController(service);

        assertThat(controller.preview(connectionId, classroomLinkId))
                .isSameAs(result);
    }
}
