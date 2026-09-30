package br.com.arenadev.dynamic;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ParticipantSelectionServiceTest {
    private final ParticipantSelectionService service = new ParticipantSelectionService();

    @Test
    void rejectsDrawWithoutPresentStudents() {
        assertThatThrownBy(() -> service.select(List.of(), Map.of(), null, 0.5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Não há alunos presentes");
    }

    @Test
    void avoidsImmediateRepeatWhenAnotherStudentIsAvailable() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();

        ParticipantSelectionService.Selection selection = service.select(
                List.of(first, second),
                Map.of(first.toString(), 1, second.toString(), 1),
                first.toString(),
                0.0
        );

        assertThat(selection.studentId()).isEqualTo(second);
    }

    @Test
    void allowsTheOnlyPresentStudentEvenWhenTheyWereLastDrawn() {
        UUID student = UUID.randomUUID();

        ParticipantSelectionService.Selection selection = service.select(
                List.of(student),
                Map.of(student.toString(), 2),
                student.toString(),
                0.5
        );

        assertThat(selection.studentId()).isEqualTo(student);
        assertThat(selection.drawCounts()).containsEntry(student.toString(), 3);
    }

    @Test
    void givesMoreWeightToStudentsWithFewerPreviousDraws() {
        UUID lessDrawn = UUID.randomUUID();
        UUID moreDrawn = UUID.randomUUID();

        ParticipantSelectionService.Selection selection = service.select(
                List.of(lessDrawn, moreDrawn),
                Map.of(lessDrawn.toString(), 0, moreDrawn.toString(), 10),
                null,
                0.5
        );

        assertThat(selection.studentId()).isEqualTo(lessDrawn);
    }

    @Test
    void returnsANewCountMapWithoutMutatingTheInput() {
        UUID student = UUID.randomUUID();
        Map<String, Integer> original = new HashMap<>();
        original.put(student.toString(), 4);

        ParticipantSelectionService.Selection selection = service.select(
                List.of(student),
                original,
                null,
                0.25
        );

        assertThat(original).containsEntry(student.toString(), 4);
        assertThat(selection.drawCounts()).containsEntry(student.toString(), 5);
    }
}
