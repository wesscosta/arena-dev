package br.com.arenadev.submission;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class BatchAssessmentServiceTest {
    @Test void rejectsEmptyBatch() {
        var service = new BatchAssessmentService(mock(SubmissionDashboardService.class), mock(AiAssessmentService.class));
        assertThatThrownBy(() -> service.generateAiSuggestions(UUID.randomUUID(), List.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ao menos uma");
    }
    @Test void limitsBatchSize() {
        var service = new BatchAssessmentService(mock(SubmissionDashboardService.class), mock(AiAssessmentService.class));
        var ids = java.util.stream.IntStream.range(0, 21).mapToObj(i -> UUID.randomUUID()).toList();
        assertThatThrownBy(() -> service.generateAiSuggestions(UUID.randomUUID(), ids))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("20");
    }
}
