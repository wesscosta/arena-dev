package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.dynamic.ParticipantSelectorPresentation;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ParticipantSelectorPresentationIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ParticipantSelectorPresentationIT.class);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private MechanicsService mechanicsService;

    @Test
    void persistsPresentationWithoutChangingTheBalancedDrawState() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Selector " + suffix, "SEL" + suffix);
        var student = studentService.create("REG-" + suffix, "Ana Selector " + suffix, "Ana");
        classroomService.enroll(classroom.id(), student.id());
        var session = sessionService.start(
                classroom.id(),
                "Aula Selector",
                Set.of(student.id())
        );

        var initial = mechanicsService.getRuntime(session.id());
        assertThat(initial.selectorPresentation())
                .isEqualTo(ParticipantSelectorPresentation.GRID_SPOTLIGHT);

        var wheel = mechanicsService.setDrawPresentation(
                session.id(),
                ParticipantSelectorPresentation.WHEEL
        );
        assertThat(wheel.selectorPresentation())
                .isEqualTo(ParticipantSelectorPresentation.WHEEL);

        mechanicsService.draw(session.id());

        var afterDraw = mechanicsService.getRuntime(session.id());
        assertThat(afterDraw.selectorPresentation())
                .isEqualTo(ParticipantSelectorPresentation.WHEEL);
        assertThat(afterDraw.lastDrawnStudentId()).isEqualTo(student.id().toString());
        assertThat(afterDraw.drawCounts()).containsEntry(student.id().toString(), 1);

        var grid = mechanicsService.setDrawPresentation(
                session.id(),
                ParticipantSelectorPresentation.GRID_SPOTLIGHT
        );
        assertThat(grid.selectorPresentation())
                .isEqualTo(ParticipantSelectorPresentation.GRID_SPOTLIGHT);
        assertThat(grid.drawCounts()).containsEntry(student.id().toString(), 1);
    }
}
