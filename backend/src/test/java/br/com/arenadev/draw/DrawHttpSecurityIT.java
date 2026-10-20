package br.com.arenadev.draw;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = { "app.teacher.username=http-teacher", "app.teacher.password=http-test-password" })
class DrawHttpSecurityIT {
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, DrawHttpSecurityIT.class);
    }

    @LocalServerPort int port;
    @Autowired ClassroomService classrooms;
    @Autowired StudentService students;
    @Autowired SessionService sessions;
    @Autowired ScoreEventService scores;

    @Test
    void protectsDrawAndLearningCycleRoutesWithSessionAndCsrfAndRejectsProtocolMixing() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("HTTP " + suffix,"HT"+suffix);
        var person=students.create("HTTP-"+suffix,"Aluna HTTP",null);
        classrooms.enroll(classroom.id(),person.id());
        var session=sessions.start(classroom.id(),"Aula de teste HTTP",Set.of(person.id()));
        String drawPath="/api/sessions/"+session.id()+"/draw-attempts";
        String cyclePath="/api/sessions/"+session.id()+"/learning-cycles";
        String clinicPath="/api/sessions/"+session.id()+"/learning-checks/"+UUID.randomUUID()+"/error-clinic";
        HttpClient anonymous=HttpClient.newHttpClient();
        assertThat(call(anonymous,"GET",drawPath+"/state",null,null).statusCode()).isEqualTo(401);
        assertThat(call(anonymous,"GET",cyclePath,null,null).statusCode()).isEqualTo(401);
        assertThat(call(anonymous,"GET",clinicPath,null,null).statusCode()).isEqualTo(401);
        assertThat(call(anonymous,"POST",drawPath,"{}",null).statusCode()).isEqualTo(403);

        CookieManager cookies=new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        HttpClient teacher=HttpClient.newBuilder().cookieHandler(cookies).build();
        HttpResponse<String> csrf=call(teacher,"GET","/api/auth/csrf",null,null);
        assertThat(csrf.statusCode()).isEqualTo(200);
        String token=csrf.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*","$1");
        assertThat(call(teacher,"POST","/api/auth/login",
                "{\"username\":\"http-teacher\",\"password\":\"http-test-password\"}",token).statusCode()).isEqualTo(200);
        assertThat(call(teacher,"GET",drawPath+"/state",null,null).statusCode()).isEqualTo(200);
        assertThat(call(teacher,"GET",cyclePath,null,null).statusCode()).isEqualTo(200);
        assertThat(call(teacher,"GET",clinicPath,null,null).statusCode()).isEqualTo(404);
        assertThat(call(teacher,"POST",clinicPath+"/notes","{}",null).statusCode()).isEqualTo(403);
        assertThat(call(teacher,"POST",drawPath,"{}",null).statusCode()).isEqualTo(403);

        String requestId=UUID.randomUUID().toString();
        HttpResponse<String> selected=call(teacher,"POST",drawPath,"{\"requestId\":\""+requestId+"\"}",token);
        assertThat(selected.statusCode()).isEqualTo(201);
        assertThat(selected.body()).contains("\"status\":\"PENDING\"");
        HttpResponse<String> repeated=call(teacher,"POST",drawPath,"{\"requestId\":\""+requestId+"\"}",token);
        assertThat(repeated.statusCode()).isEqualTo(201);
        assertThat(repeated.body()).isEqualTo(selected.body());
        HttpResponse<String> legacy=call(teacher,"POST","/api/sessions/"+session.id()+"/mechanics/draw","{}",token);
        assertThat(legacy.statusCode()).isEqualTo(409);
        assertThat(call(teacher,"GET","/api/sessions/"+UUID.randomUUID()+"/draw-attempts/state",null,null).statusCode())
                .isEqualTo(404);
        assertThat(call(teacher,"GET","/api/sessions/"+UUID.randomUUID()+"/learning-cycles",null,null).statusCode())
                .isEqualTo(404);
    }

    @Test
    void scoreCorrectionRequiresAuthenticationCsrfAndIsIdempotentOverHttp() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("XP HTTP " + suffix,"XH"+suffix);
        var person=students.create("XPH-"+suffix,"Pessoa XP HTTP",null);
        classrooms.enroll(classroom.id(),person.id());
        var session=sessions.start(classroom.id(),"Reversão auditável",Set.of(person.id()));
        var original=scores.create(new ScoreEventService.CreateScoreEvent(classroom.id(),person.id(),
                session.id(),7,ScoreCategory.QUESTION,"Revisão",ScoreSource.ARENA,null,null));
        String url="/api/score-events/"+original.id()+"/reverse";
        var anonymous=HttpClient.newHttpClient();
        assertThat(call(anonymous,"POST",url,"{}",null).statusCode()).isEqualTo(403);
        CookieManager cookies=new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        HttpClient teacher=HttpClient.newBuilder().cookieHandler(cookies).build();
        String csrf=call(teacher,"GET","/api/auth/csrf",null,null).body();
        String token=csrf.replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*","$1");
        assertThat(call(teacher,"POST","/api/auth/login",
                "{\"username\":\"http-teacher\",\"password\":\"http-test-password\"}",token).statusCode())
                .isEqualTo(200);
        assertThat(call(teacher,"POST",url,"{}",null).statusCode()).isEqualTo(403);
        assertThat(call(teacher,"POST",url,"{}",token).statusCode()).isEqualTo(400);
        String id=UUID.randomUUID().toString();
        String body="{\"requestId\":\""+id+"\"}";
        var first=call(teacher,"POST",url,body,token);
        assertThat(first.statusCode()).isEqualTo(201);
        var retry=call(teacher,"POST",url,body,token);
        assertThat(retry.statusCode()).isEqualTo(201);
        assertThat(retry.body()).isEqualTo(first.body());
        assertThat(call(teacher,"POST",url,"{\"requestId\":\""+UUID.randomUUID()+"\"}",token).statusCode())
                .isEqualTo(409);
        assertThat(scores.list(classroom.id())).hasSize(2);
    }

    private HttpResponse<String> call(HttpClient client, String method, String path, String body, String token)
            throws Exception {
        var req=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path))
                .header("Content-Type","application/json");
        if(token!=null)req.header("X-XSRF-TOKEN",token);
        return client.send(req.method(method,body==null
                ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                .build(),HttpResponse.BodyHandlers.ofString());
    }
}
