package br.com.arenadev.learning.placement;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.content.LearningResourceFormat;
import br.com.arenadev.content.LearningResourceService;
import br.com.arenadev.content.LearningResourceSourceType;
import br.com.arenadev.session.SessionService;
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
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties={"app.teacher.username=placement-test","app.teacher.password=placement-test-secret"})
class ArenaResourcePlacementIT {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ArenaResourcePlacementIT.class);
    }

    @Autowired ArenaResourcePlacementService placements;
    @Autowired LearningResourceService resources;
    @Autowired ClassroomService classrooms;
    @Autowired SessionService sessions;
    @LocalServerPort int port;

    @Test
    void canonicalResourceCanBeReusedWithoutDuplicationAndCannotBeLeakedWhenArchived() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        var classA=classrooms.create("Material contexto " + suffix, "MC" + suffix);
        var classB=classrooms.create("Outra sala contexto " + suffix, "OC" + suffix);
        var sessionA=sessions.start(classA.id(), "Aula usando Biblioteca",Set.of());
        var sessionB=sessions.start(classB.id(), "Outra aula usando acervo",Set.of());
        var canonical=resources.createLibrary(new LearningResourceService.LibraryResourceInput(
                "SQL WHERE " + suffix,"Filtros na prática","# WHERE\nUse em consultas.",
                LearningResourceFormat.MARKDOWN,LearningResourceSourceType.MANUAL,null,null,
                "Banco de Dados",List.of("SQL"),"pt-BR"));
        var other=resources.createLibrary(new LearningResourceService.LibraryResourceInput(
                "SQL JOIN " + suffix,null,"# JOIN",LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL,null,null,"SQL",List.of(),"pt-BR"));
        assertThat(placements.get(sessionA.id())).isNull();
        var linked=placements.link(sessionA.id(),canonical.id());
        assertThat(linked.resourceId()).isEqualTo(canonical.id());
        assertThat(linked.available()).isTrue();
        assertThat(placements.link(sessionA.id(),canonical.id())).isEqualTo(linked); // same action idempotent
        assertThat(placements.get(sessionB.id())).isNull(); // no cross-session propagation
        assertThat(placements.link(sessionB.id(),canonical.id()).resourceId()).isEqualTo(canonical.id());
        assertThat(placements.link(sessionA.id(),other.id()).resourceId()).isEqualTo(other.id());
        assertThat(placements.get(sessionB.id()).resourceId()).isEqualTo(canonical.id());
        resources.archiveLibrary(canonical.id());
        assertThat(placements.get(sessionB.id()).available()).isFalse();
        assertThatThrownBy(()->placements.link(sessionA.id(),canonical.id()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("publicado");
        assertThat(placements.get(sessionA.id()).resourceId()).isEqualTo(other.id());
        placements.unlink(sessionA.id());
        placements.unlink(sessionA.id());
        assertThat(placements.get(sessionA.id())).isNull();
        assertThat(resources.getLibrary(other.id()).id()).isEqualTo(other.id());

        HttpClient anonymous=HttpClient.newHttpClient();
        String endpoint="http://localhost:"+port+"/api/sessions/"+sessionB.id()+"/contextual-material";
        var denied=anonymous.send(HttpRequest.newBuilder(URI.create(endpoint)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(denied.statusCode()).isEqualTo(401);
        var cookies=new CookieManager();cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        var teacher=HttpClient.newBuilder().cookieHandler(cookies).build();
        var csrf=teacher.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/auth/csrf"))
                .GET().build(),HttpResponse.BodyHandlers.ofString());
        String token=csrf.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*","$1");
        var login=teacher.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/auth/login"))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"placement-test\",\"password\":\"placement-test-secret\"}"))
                .build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        var read=teacher.send(HttpRequest.newBuilder(URI.create(endpoint)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(read.statusCode()).isEqualTo(200);
        assertThat(read.body()).contains("\"available\":false");
        var blocked=teacher.send(HttpRequest.newBuilder(URI.create(endpoint))
                .header("Content-Type","application/json")
                .PUT(HttpRequest.BodyPublishers.ofString("{\"resourceId\":\""+other.id()+"\"}"))
                .build(),HttpResponse.BodyHandlers.ofString());
        assertThat(blocked.statusCode()).isEqualTo(403);
        var allowed=teacher.send(HttpRequest.newBuilder(URI.create(endpoint))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .PUT(HttpRequest.BodyPublishers.ofString("{\"resourceId\":\""+other.id()+"\"}"))
                .build(),HttpResponse.BodyHandlers.ofString());
        assertThat(allowed.statusCode()).isEqualTo(200);
        assertThat(allowed.body()).contains(other.id().toString());
    }
}
