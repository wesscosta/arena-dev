package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentAnonymizationService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.study.StudentProfileService;
import br.com.arenadev.study.StudyPrincipalResolver;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** v0.12: the teacher registers by name or e-mail and the student completes the registration. */
@SpringBootTest
class StudentEmailIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, StudentEmailIT.class);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionJoinService joinService;
    @Autowired private StudentProfileService profiles;
    @Autowired private StudyPrincipalResolver principals;
    @Autowired private StudentAnonymizationService anonymization;

    @Test
    void teacherRegistersByEmailAloneAndStudentCompletesTheName() {
        String suffix = suffix();
        var student = studentService.create(null, "  ", null, " Ana." + suffix + "@Escola.org ");

        assertThat(student.email()).isEqualTo("ana." + suffix.toLowerCase() + "@escola.org");
        assertThat(student.emailSource()).isEqualTo(Student.EmailSource.TEACHER);
        assertThat(student.namePending()).isTrue();
        assertThat(student.name()).isEqualTo("ana." + suffix.toLowerCase());

        Scenario scenario = scenario(student.id());
        var joined = joinService.join(scenario.joinCode(), "ANA." + suffix + "@escola.org", true);
        assertThat(joined.access().studentId()).isEqualTo(student.id());
        assertThat(joined.access().profileComplete()).isFalse();

        var principal = principals.resolve(joined.deviceToken());
        assertThatThrownBy(() -> profiles.complete(principal, " ", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Informe seu nome completo.");
        assertThatThrownBy(() -> profiles.complete(principal, "Ana Souza", "outro" + suffix + "@escola.org"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Seu e-mail foi cadastrado pelo professor. Peça a ele para alterar.");

        var completed = profiles.complete(principal, "Ana Souza " + suffix, null);
        assertThat(completed.name()).isEqualTo("Ana Souza " + suffix);
        assertThat(completed.namePending()).isFalse();
        assertThat(completed.email()).isEqualTo(student.email());
        assertThat(completed.emailSetByTeacher()).isTrue();
        assertThat(completed.complete()).isTrue();

        var renamed = profiles.complete(principal, "Outro Nome", null);
        assertThat(renamed.name()).as("the name is the teacher's once completed").isEqualTo("Ana Souza " + suffix);
    }

    @Test
    void studentDeclaresEmailUntilTheTeacherSetsOne() {
        String suffix = suffix();
        var student = studentService.create("EM-" + suffix, "Bruno Lima " + suffix, null, null);
        assertThat(student.namePending()).isFalse();
        Scenario scenario = scenario(student.id());
        var joined = joinService.join(scenario.joinCode(), "EM-" + suffix, true);
        assertThat(joined.access().profileComplete()).as("e-mail is optional").isTrue();
        var principal = principals.resolve(joined.deviceToken());

        var declared = profiles.complete(principal, null, "bruno" + suffix + "@casa.org");
        assertThat(declared.email()).isEqualTo("bruno" + suffix.toLowerCase() + "@casa.org");
        assertThat(declared.emailSetByTeacher()).isFalse();
        assertThat(profiles.complete(principal, null, "bruno2" + suffix + "@casa.org").email())
                .isEqualTo("bruno2" + suffix.toLowerCase() + "@casa.org");
        assertThat(profiles.complete(principal, null, "").email()).isNull();

        var byTeacher = studentService.updateEmail(student.id(), "bruno" + suffix + "@escola.org");
        assertThat(byTeacher.emailSource()).isEqualTo(Student.EmailSource.TEACHER);
        assertThatThrownBy(() -> profiles.complete(principal, null, "bruno3" + suffix + "@casa.org"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void emailIsUniqueIgnoringCaseAndMustHaveAnAddressShape() {
        String suffix = suffix();
        studentService.create(null, "Carla " + suffix, null, "carla" + suffix + "@escola.org");

        assertThatThrownBy(() -> studentService.create(null, "Outra Carla", null, "CARLA" + suffix + "@escola.org"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Este e-mail já está em uso por outro aluno. Fale com o professor.");
        assertThatThrownBy(() -> studentService.create(null, "Sem Arroba", null, "carla.escola.org"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("E-mail inválido.");
        assertThatThrownBy(() -> studentService.create(null, " ", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Informe o nome ou o e-mail do aluno.");

        var other = studentService.create(null, "Davi " + suffix, null, null);
        Scenario scenario = scenario(other.id());
        var joined = joinService.join(scenario.joinCode(), "Davi " + suffix, true);
        var principal = principals.resolve(joined.deviceToken());
        assertThatThrownBy(() -> profiles.complete(principal, null, "carla" + suffix + "@escola.org"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Este e-mail já está em uso por outro aluno. Fale com o professor.");
    }

    @Test
    void anonymizationErasesTheEmail() {
        String suffix = suffix();
        var student = studentService.create(null, "Elisa " + suffix, null, "elisa" + suffix + "@escola.org");

        var anonymized = anonymization.anonymize(student.id(), "Elisa " + suffix);

        assertThat(anonymized.email()).isNull();
        assertThat(anonymized.emailSource()).isNull();
        var reused = studentService.create(null, "Nova Elisa", null, "elisa" + suffix + "@escola.org");
        assertThat(reused.email()).isEqualTo("elisa" + suffix.toLowerCase() + "@escola.org");
    }

    private Scenario scenario(UUID studentId) {
        String suffix = suffix();
        var classroom = classroomService.create("Turma E-mail " + suffix, "EM" + suffix);
        classroomService.enroll(classroom.id(), studentId);
        var session = sessionService.start(classroom.id(), "Aula E-mail", Set.of(studentId));
        return new Scenario(joinService.ensureCode(session.id()).code());
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private record Scenario(String joinCode) {}
}
