package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.dynamic.MechanicsService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class ManualGroupsIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_manual_groups_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private MechanicsService mechanicsService;

    @Test
    void savesManualPartitionAndExposesItInSessionRuntime() {
        Scenario scenario = scenario(4);

        List<List<UUID>> manual = List.of(
                List.of(scenario.students().get(0), scenario.students().get(2)),
                List.of(scenario.students().get(1), scenario.students().get(3))
        );

        MechanicsService.GroupsResult result =
                mechanicsService.setGroups(scenario.sessionId(), manual);

        assertThat(result.groups()).containsExactly(
                manual.get(0).stream().map(UUID::toString).toList(),
                manual.get(1).stream().map(UUID::toString).toList()
        );
        assertThat(result.runtime().groups()).isEqualTo(result.groups());
        assertThat(result.runtime().groupSize()).isEqualTo(2);
        assertThat(mechanicsService.getRuntime(scenario.sessionId()).groups())
                .isEqualTo(result.groups());
    }

    @Test
    void rejectsDuplicatesMissingParticipantsUnknownParticipantsAndEmptyGroups() {
        Scenario scenario = scenario(3);
        UUID first = scenario.students().get(0);
        UUID second = scenario.students().get(1);
        UUID third = scenario.students().get(2);

        assertThatThrownBy(() -> mechanicsService.setGroups(
                scenario.sessionId(),
                List.of(List.of(first, second), List.of(second, third))
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("apenas um grupo");

        assertThatThrownBy(() -> mechanicsService.setGroups(
                scenario.sessionId(),
                List.of(List.of(first), List.of(second))
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Todos os participantes");

        assertThatThrownBy(() -> mechanicsService.setGroups(
                scenario.sessionId(),
                List.of(
                        List.of(first, second),
                        List.of(third, UUID.randomUUID())
                )
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ausente ou desconhecido");

        List<List<UUID>> withEmpty = new ArrayList<>();
        withEmpty.add(List.of(first, second, third));
        withEmpty.add(List.of());
        assertThatThrownBy(() -> mechanicsService.setGroups(
                scenario.sessionId(),
                withEmpty
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Grupos vazios");
    }

    private Scenario scenario(int count) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create(
                "Turma Manual Groups " + suffix,
                "MG" + suffix
        );

        ArrayList<UUID> students = new ArrayList<>();
        for (int index = 1; index <= count; index++) {
            var student = studentService.create(
                    "MG-" + suffix + "-" + index,
                    "Aluno " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            students.add(student.id());
        }

        var session = sessionService.start(
                classroom.id(),
                "Aula Manual Groups",
                Set.copyOf(students)
        );

        return new Scenario(session.id(), List.copyOf(students));
    }

    private record Scenario(UUID sessionId, List<UUID> students) {}
}
