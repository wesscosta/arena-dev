package br.com.arenadev;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.study.StudentLiveDiscoveryService;
import br.com.arenadev.study.StudyPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class StudentLiveDiscoveryIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, StudentLiveDiscoveryIT.class);
    }

    @Autowired private ClassroomService classrooms;
    @Autowired private StudentService students;
    @Autowired private SessionService sessions;
    @Autowired private StudentLiveDiscoveryService live;

    @Test
    void discoversActiveSessionsAcrossEnrollmentsWithoutStudyWorkspaceGate() {
        var classroomA = classrooms.create("Banco de Dados", "LIVE-A");
        var classroomB = classrooms.create("Desenvolvimento Web", "LIVE-B");
        var student = students.create("LIVE-001", "Aluno Multi Turma", null);
        var enrollmentA = classrooms.enroll(classroomA.id(), student.id());
        classrooms.enroll(classroomB.id(), student.id());

        var sessionA = sessions.start(classroomA.id(), "Normalização", Set.of());
        var sessionB = sessions.start(classroomB.id(), "APIs REST", Set.of());
        var principal = new StudyPrincipal(student.id(), enrollmentA.enrollmentId(), classroomA.id(), StudyPrincipal.Role.STUDENT);

        var discovered = live.list(principal);
        assertThat(discovered).hasSize(2);
        assertThat(discovered).extracting(StudentLiveDiscoveryService.LiveSessionSummary::classroomId)
                .containsExactlyInAnyOrder(classroomA.id(), classroomB.id());
        assertThat(discovered).allSatisfy(item -> assertThat(item.joinCode()).isNotBlank());

        sessions.finish(sessionB.id());
        assertThat(live.list(principal)).extracting(StudentLiveDiscoveryService.LiveSessionSummary::sessionId)
                .containsExactly(sessionA.id());
    }
}
