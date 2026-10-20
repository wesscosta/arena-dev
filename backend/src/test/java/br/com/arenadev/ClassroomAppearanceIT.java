package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ClassroomAppearanceIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ClassroomAppearanceIT.class);
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
