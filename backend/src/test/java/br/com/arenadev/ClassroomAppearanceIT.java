package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class ClassroomAppearanceIT {
    @Container
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("arena_dev_classroom_appearance_test")
                    .withUsername("arena_test")
                    .withPassword("arena_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private ClassroomService classroomService;

    @Test
    void keepsArenaDefaultsAndPersistsCuratedAppearance() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        ClassroomService.ClassroomView defaultClassroom =
                classroomService.create("Turma padrão " + suffix, "PAD-" + suffix);

        assertThat(defaultClassroom.themeColor()).isEqualTo("emerald");
        assertThat(defaultClassroom.themeIcon()).isEqualTo("code");

        ClassroomService.ClassroomView styled = classroomService.update(
                defaultClassroom.id(),
                defaultClassroom.name(),
                defaultClassroom.code(),
                true,
                "blue",
                "database"
        );

        assertThat(styled.themeColor()).isEqualTo("blue");
        assertThat(styled.themeIcon()).isEqualTo("database");
    }

    @Test
    void rejectsAppearanceOutsideCuratedSet() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        assertThatThrownBy(() ->
                classroomService.create("Turma inválida " + suffix, "INV-" + suffix, "#ff00ff", "unicorn")
        ).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Cor da turma");
    }
}
