package br.com.arenadev.draw;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = { "app.teacher.username=http-teacher", "app.teacher.password=http-test-password" })
class DrawHttpSecurityIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("draw_http_security").withUsername("arena_test").withPassword("arena_test");

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @LocalServerPort int port;
    @Autowired ClassroomService classrooms;
    @Autowired StudentService students;
    @Autowired SessionService sessions;

    @Test
    void protectsDrawAndLearningCycleRoutesWithSessionAndCsrfAndRejectsProtocolMixing() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0,7).toUpperCase();
        var classroom=classrooms.create("HTTP " + suffix,"HT"+suffix);
        var person=students.create("HTTP-"+suffix,"Aluna HTTP",null);
        classrooms.enroll(classroom.id(),person.id());
        var session=sessions.start(classroom.id(),"Aula de teste HTTP",Set.of(person.id()));
        String drawPath="/api/sessions/"+session.id()+"/draw-attempts";
        String cyclePath="/api/sessions/"+session.id()+"/learning-cycles";
        HttpClient anonymous=HttpClient.newHttpClient();
        assertThat(call(anonymous,"GET",drawPath+"/state",null,null).statusCode()).isEqualTo(401);
        assertThat(call(anonymous,"GET",cyclePath,null,null).statusCode()).isEqualTo(401);
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
