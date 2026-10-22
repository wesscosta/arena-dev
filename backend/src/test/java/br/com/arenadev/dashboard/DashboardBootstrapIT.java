package br.com.arenadev.dashboard;

import br.com.arenadev.support.SharedPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties={"app.teacher.username=dashboard-teacher","app.teacher.password=dashboard-test-password"})
class DashboardBootstrapIT {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, DashboardBootstrapIT.class);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired DashboardBootstrapService service;
    @LocalServerPort int port;

    @Test
    void oneReadModelPreserves350Classrooms340SessionsParticipantsAndScoreReversals() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        jdbc.update("""
                insert into classrooms (id,name,active,theme_color,theme_icon,student_study_access_enabled)
                select gen_random_uuid(), 'Carga ' || ? || '-' || x, true, 'emerald', 'code', false
                  from generate_series(1, 350) x
                """,suffix);
        jdbc.update("""
                insert into class_sessions (id,classroom_id,title,status)
                select gen_random_uuid(),c.id,'Aula de carga','ACTIVE'
                  from classrooms c where c.name like ? order by c.name limit 340
                ""","Carga "+suffix+"-%");
        UUID classroomId=jdbc.queryForObject("select classroom_id from class_sessions order by started_at desc limit 1",UUID.class);
        UUID sessionId=jdbc.queryForObject("select id from class_sessions where classroom_id=?",UUID.class,classroomId);
        UUID studentId=UUID.randomUUID();
        jdbc.update("insert into students(id,registration,name,nickname,email,email_source) values(?,?,?,?,?,'STUDENT')",
                studentId,"CARGA-"+suffix,"Pessoa Teste de Carga",null,"carga"+suffix+"@escola.org");
        jdbc.update("insert into enrollments(id,classroom_id,student_id,preferred_name) values(?,?,?,?)",
                UUID.randomUUID(),classroomId,studentId,"Nome da Turma");
        jdbc.update("insert into session_participants(id,session_id,student_id,present,connected) values(?,?,?,true,false)",
                UUID.randomUUID(),sessionId,studentId);
        UUID original=UUID.randomUUID();
        jdbc.update("""
                insert into score_events(id,classroom_id,student_id,session_id,points,category,description,source)
                values(?,?,?,?,10,'QUESTION','Acerto','MANUAL')
                """,original,classroomId,studentId,sessionId);
        jdbc.update("""
                insert into score_events(id,classroom_id,student_id,session_id,points,category,description,source,reversal_of)
                values(?,?,?,?,-10,'ADJUSTMENT','Reversão','MANUAL',?)
                """,UUID.randomUUID(),classroomId,studentId,sessionId,original);
        jdbc.update("insert into activities(id,classroom_id,title,points,on_time_bonus) values(?,?,?,5,0)",
                UUID.randomUUID(),classroomId,"Atividade carga");

        var snapshot=service.bootstrap();
        assertThat(snapshot.classrooms()).hasSize(350);
        assertThat(snapshot.sessions()).hasSize(340);
        assertThat(snapshot.students()).hasSize(1);
        // The teacher's roster reads the e-mail a student declared in the profile from here.
        assertThat(snapshot.students().getFirst())
                .containsEntry("email","carga"+suffix+"@escola.org")
                .containsEntry("namePending",false);
        assertThat(snapshot.enrollments()).hasSize(1);
        assertThat(snapshot.sessionParticipants()).hasSize(1);
        assertThat(snapshot.sessionParticipants().getFirst()).containsEntry("displayName","Nome da Turma");
        assertThat(snapshot.scoreEvents()).hasSize(2);
        assertThat(snapshot.scoreEvents().stream().filter(row->original.equals(row.get("id"))).findFirst().orElseThrow())
                .containsEntry("reversed",true);
        assertThat(snapshot.activities()).hasSize(1);

        // Only one HTTP call is required for the dashboard, unlike the previous fan-out.
        HttpClient anonymous=HttpClient.newHttpClient();
        String path="http://localhost:"+port+"/api/dashboard/bootstrap";
        assertThat(anonymous.send(HttpRequest.newBuilder(URI.create(path)).GET().build(),
                HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
        CookieManager cookies=new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        HttpClient teacher=HttpClient.newBuilder().cookieHandler(cookies).build();
        var csrf=teacher.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/auth/csrf"))
                .GET().build(),HttpResponse.BodyHandlers.ofString());
        String token=csrf.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*","$1");
        var login=teacher.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/auth/login"))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"dashboard-teacher\",\"password\":\"dashboard-test-password\"}"))
                .build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        var response=teacher.send(HttpRequest.newBuilder(URI.create(path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"classrooms\"","\"sessions\"","\"sessionParticipants\"",
                "\"Nome da Turma\"","\"reversed\":true");
        assertThat(response.body()).doesNotContain("accessTokenHash");
    }
}
