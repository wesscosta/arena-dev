package br.com.arenadev;

import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.content.LearningResourceFormat;
import br.com.arenadev.content.LearningResourceService;
import br.com.arenadev.content.LearningResourceSourceType;
import br.com.arenadev.learning.placement.ArenaResourcePlacementService;
import br.com.arenadev.learning.presentation.MaterialPublicationService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.stage.LiveStageAudience;
import br.com.arenadev.stage.LiveStageService;
import br.com.arenadev.stage.LiveStageType;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.teacher.username=material-teacher", "app.teacher.password=material-password"
})
class MaterialPublicationIT {
    @Container
    static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_material_test").withUsername("arena_test").withPassword("arena_test");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", DB::getJdbcUrl);
        registry.add("spring.datasource.username", DB::getUsername);
        registry.add("spring.datasource.password", DB::getPassword);
    }

    @Autowired ClassroomService classrooms;
    @Autowired SessionService sessions;
    @Autowired LearningResourceService resources;
    @Autowired ArenaResourcePlacementService placements;
    @Autowired MaterialPublicationService publications;
    @Autowired LiveStageService stage;
    @Autowired SessionJoinService join;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @LocalServerPort int port;

    private record Scenario(UUID sessionId, UUID resourceId, String code) {}

    private Scenario scenario(String body) {
        String suffix = UUID.randomUUID().toString().substring(0,8).toUpperCase();
        var classroom = classrooms.create("Publicacao " + suffix,"MP" + suffix);
        var session = sessions.start(classroom.id(), "Aula", Set.of());
        var resource = resources.createLibrary(new LearningResourceService.LibraryResourceInput(
                "SQL básico", "Revisão", body, LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL, null, null, "Banco de Dados",
                java.util.List.of("SQL"), "pt-BR"));
        placements.link(session.id(), resource.id());
        return new Scenario(session.id(),resource.id(),join.ensureCode(session.id()).code());
    }

    private MaterialPublicationService.PublicationView publish(Scenario s, long version, UUID id) {
        return publications.publish(s.sessionId(),
                new MaterialPublicationService.PublishCommand(s.resourceId(),version,id));
    }

    private HttpResponse<String> request(HttpClient client, String method, String path, String body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type","application/json");
        return client.send(builder.method(method, body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void publishPinsImmutableBodyAndOnlyExposesTheActiveProjection() throws Exception {
        Scenario s = scenario("# SQL\n## SELECT\nPrimeiro texto");
        UUID requestId = UUID.randomUUID();
        var published = publish(s,0,requestId);
        assertThat(published.status()).isEqualTo("ACTIVE");
        assertThat(stage.projectorState(s.sessionId()).primary().type()).isEqualTo(LiveStageType.MATERIAL);
        assertThat(stage.participantState(s.sessionId()).primary().type()).isEqualTo(LiveStageType.IDLE);
        assertThat(stage.version(s.sessionId())).isEqualTo(1);
        assertThat(publications.publish(s.sessionId(),
                new MaterialPublicationService.PublishCommand(s.resourceId(),0L,requestId)).id())
                .isEqualTo(published.id());
        assertThat(jdbc.queryForObject("select count(*) from arena_material_publications where session_id=?",
                Integer.class,s.sessionId())).isEqualTo(1);

        HttpClient anonymous = HttpClient.newHttpClient();
        var publicContent = request(anonymous,"GET","/api/projector/"+s.code()+"/material",null);
        assertThat(publicContent.statusCode()).isEqualTo(200);
        assertThat(publicContent.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(publicContent.body()).contains("Primeiro texto","\"publicationId\"","\"anchor\":\"sql\"");
        assertThat(publicContent.body()).doesNotContain("resourceId","sourceUrl","sourceReference","requestId","classroomId");
        assertThat(request(anonymous,"GET","/api/projector/INVALIDCODE/material",null).statusCode()).isNotEqualTo(200);

        resources.updateLibrary(s.resourceId(),new LearningResourceService.LibraryResourceInput(
                "SQL básico", "Revisão", "# SQL\n## SELECT\nTexto alterado", LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL,null,null,"Banco de Dados",java.util.List.of("SQL"),"pt-BR"));
        assertThat(publications.publicMaterial(s.code()).body()).contains("Primeiro texto").doesNotContain("Texto alterado");
        assertThatThrownBy(()->publish(s,0,UUID.randomUUID())).hasMessageContaining("Palco desatualizado");
    }

    @Test
    void djangoTutorialWithHtmlExamplesInFencesCanBePresented() {
        String code = """
                # Controle de Estoque com Django

                <aside>
                **Versão de referência:** material para construção do sistema.
                </aside>

                ```html
                <img src="{{ produto.imagem.url }}" alt="{{ produto.nome }}">
                <script>
                    const form = document.querySelector('#form-movimentacao');
                </script>
                ```

                ## Criar movimentações
                """;
        String body = code + ("Exemplo de operação e validação do estoque.\n").repeat(2250);
        assertThat(body.length()).isBetween(95_000, 120_000);
        Scenario s = scenario(body);
        var publication = publish(s, 0L, UUID.randomUUID());
        assertThat(publication.status()).isEqualTo("ACTIVE");
        var presented = publications.publicMaterial(s.code());
        assertThat(presented.body()).isEqualTo(body.strip());
        assertThat(presented.body()).contains("<script>", "<img src");
        assertThat(stage.projectorState(s.sessionId()).primary().type())
                .isEqualTo(LiveStageType.MATERIAL);
        assertThat(stage.participantState(s.sessionId()).primary().type())
                .isEqualTo(LiveStageType.IDLE);
    }

    @Test
    void withdrawAndSwitchStageRevokeWithoutResurrection() {
        Scenario s = scenario("# SQL\nPrimeiro");
        UUID id = UUID.randomUUID();
        var pub = publish(s,0,id);
        UUID withdrawalId = UUID.randomUUID();
        var withdrawn = publications.withdraw(s.sessionId(),new MaterialPublicationService.WithdrawCommand(pub.id(),1L,withdrawalId));
        assertThat(withdrawn.status()).isEqualTo("REVOKED");
        assertThat(stage.version(s.sessionId())).isEqualTo(2);
        assertThat(publications.withdraw(s.sessionId(),new MaterialPublicationService.WithdrawCommand(pub.id(),1L,withdrawalId)).status())
                .isEqualTo("REVOKED");
        assertThat(publications.publish(s.sessionId(),new MaterialPublicationService.PublishCommand(s.resourceId(),0L,id)).status())
                .isEqualTo("REVOKED");
        assertThatThrownBy(()->publications.publicMaterial(s.code())).hasMessageContaining("404");

        var second = publish(s,2,UUID.randomUUID());
        stage.activate(s.sessionId(),new LiveStageService.ActivateCommand(LiveStageType.BOSS_BATTLE,null, LiveStageAudience.BOTH,true));
        assertThat(stage.version(s.sessionId())).isEqualTo(4);
        assertThat(publications.current(s.sessionId())).isNull();
        assertThatThrownBy(()->publications.publicMaterial(s.code())).hasMessageContaining("404");
        assertThat(jdbc.queryForObject("select status from arena_material_publications where id=?",
                String.class,second.id())).isEqualTo("REVOKED");
        assertThatThrownBy(()->stage.activate(s.sessionId(),
                new LiveStageService.ActivateCommand(LiveStageType.MATERIAL,second.id(),LiveStageAudience.PROJECTOR,true)))
                .hasMessageContaining("protegida");
    }

    @Test
    void unlinkArchiveAndFinishPreventAnyPublicRead() {
        Scenario a = scenario("Material A");
        publish(a,0,UUID.randomUUID());
        placements.unlink(a.sessionId());
        assertThatThrownBy(()->publications.publicMaterial(a.code())).hasMessageContaining("404");

        Scenario b = scenario("Material B");
        publish(b,0,UUID.randomUUID());
        resources.archiveLibrary(b.resourceId());
        assertThatThrownBy(()->publications.publicMaterial(b.code())).hasMessageContaining("404");

        Scenario c = scenario("Material C");
        publish(c,0,UUID.randomUUID());
        sessions.finish(c.sessionId());
        assertThatThrownBy(()->publications.publicMaterial(c.code())).isInstanceOf(RuntimeException.class);
        assertThat(publications.current(c.sessionId())).isNull();
    }

    @Test
    void rejectsPrivateResourceAndUnsafeMarkdown() {
        Scenario s = scenario("Inicial");
        UUID unlinkedResource = resources.createLibrary(new LearningResourceService.LibraryResourceInput(
                "Outro",null,"Outro conteúdo",LearningResourceFormat.MARKDOWN,
                LearningResourceSourceType.MANUAL,null,null,null,java.util.List.of(),"pt-BR")).id();
        assertThatThrownBy(()->publications.publish(s.sessionId(),
                new MaterialPublicationService.PublishCommand(unlinkedResource,0L,UUID.randomUUID())))
                .hasMessageContaining("Vincule");

        Scenario unsafe = scenario("<script>alert('XSS')</script>");
        assertThatThrownBy(()->publish(unsafe,0,UUID.randomUUID()))
                .hasMessageContaining("422");
    }

    @Test
    void serializedConcurrentPublicationsHaveExactlyOneWinner() throws Exception {
        Scenario s = scenario("# Concorrência");
        CountDownLatch ready=new CountDownLatch(2);
        CountDownLatch start=new CountDownLatch(1);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var action=(java.util.concurrent.Callable<Boolean>)()->{
                ready.countDown(); start.await();
                try { publish(s,0,UUID.randomUUID()); return true; }
                catch (org.springframework.web.server.ResponseStatusException e) {
                    assertThat(e.getStatusCode().value()).isEqualTo(409);return false;
                }
            };
            var a=pool.submit(action);
            var b=pool.submit(action);
            ready.await();start.countDown();
            assertThat((a.get()?1:0)+(b.get()?1:0)).isEqualTo(1);
        }
        assertThat(jdbc.queryForObject("select count(*) from arena_material_publications where session_id=? and status='ACTIVE'",
                Integer.class,s.sessionId())).isEqualTo(1);
    }

    @Test
    void sectionNavigationRejectsUnknownAnchorAndReplaysSafely() {
        Scenario s = scenario("# SQL\n## Seleção\n### SELECT\n## Seleção\nFim");
        var pub = publish(s, 0, UUID.randomUUID());
        UUID requestId = UUID.randomUUID();
        var command = new MaterialPublicationService.SectionCommand(pub.id(),
                "selecao-2", 1L, requestId);
        var moved = publications.navigate(s.sessionId(), command);
        assertThat(moved.stageVersion()).isEqualTo(2);
        assertThat(moved.primary().sectionAnchor()).isEqualTo("selecao-2");
        assertThat(stage.projectorState(s.sessionId()).primary().sectionAnchor()).isEqualTo("selecao-2");
        assertThat(publications.publicMaterial(s.code()).contentHash()).hasSize(64);
        assertThat(publications.publicMaterial(s.code()).body()).contains("Fim");

        assertThat(stage.participantState(s.sessionId()).primary().sectionAnchor()).isNull();
        assertThat(jdbc.queryForObject("""
                select count(*) from arena_material_section_commands where session_id=?
                """, Integer.class, s.sessionId())).isEqualTo(1);
        assertThat(publications.navigate(s.sessionId(), command).stageVersion()).isEqualTo(2);
        assertThatThrownBy(()->publications.navigate(s.sessionId(),
                new MaterialPublicationService.SectionCommand(pub.id(),"sql",1L,requestId)))
                .hasMessageContaining("409");
        assertThatThrownBy(()->publications.navigate(s.sessionId(),
                new MaterialPublicationService.SectionCommand(pub.id(),"inexistente",2L,UUID.randomUUID())))
                .hasMessageContaining("422");
        assertThatThrownBy(()->publications.navigate(s.sessionId(),
                new MaterialPublicationService.SectionCommand(pub.id(),"sql",1L,UUID.randomUUID())))
                .hasMessageContaining("409");
        var top = publications.navigate(s.sessionId(),
                new MaterialPublicationService.SectionCommand(pub.id(),null,2L,UUID.randomUUID()));
        assertThat(top.primary().sectionAnchor()).isNull();
        assertThat(top.stageVersion()).isEqualTo(3);
        assertThat(publications.publicMaterial(s.code()).stageVersion()).isEqualTo(3);
        assertThat(stage.projectorState(s.sessionId()).stageVersion()).isEqualTo(3);
    }

    @Test
    void concurrentSectionNavigationSerializesAndWithdrawalWinsOverOldCommands() throws Exception {
        Scenario s = scenario("# Introdução\n## Parte A\n## Parte B");
        var pub = publish(s,0,UUID.randomUUID());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch fire = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var action = (java.util.concurrent.Callable<Boolean>) () -> {
                ready.countDown();fire.await();
                try {
                    publications.navigate(s.sessionId(),
                        new MaterialPublicationService.SectionCommand(pub.id(),"parte-a",1L,UUID.randomUUID()));
                    return true;
                } catch (org.springframework.web.server.ResponseStatusException ex) {
                    assertThat(ex.getStatusCode().value()).isEqualTo(409);
                    return false;
                }
            };
            var a=pool.submit(action);var b=pool.submit(action);
            ready.await();fire.countDown();
            assertThat((a.get()?1:0)+(b.get()?1:0)).isEqualTo(1);
        }
        assertThat(stage.version(s.sessionId())).isEqualTo(2);
        publications.withdraw(s.sessionId(),
                new MaterialPublicationService.WithdrawCommand(pub.id(),2L,UUID.randomUUID()));
        assertThatThrownBy(()->publications.navigate(s.sessionId(),
                new MaterialPublicationService.SectionCommand(pub.id(),"parte-b",2L,UUID.randomUUID())))
                .hasMessageContaining("409");
        assertThat(stage.projectorState(s.sessionId()).primary().type()).isEqualTo(LiveStageType.IDLE);
        assertThat(publications.current(s.sessionId())).isNull();
    }

    @Test
    void protectedMutationRequiresTeacherAndCsrf() throws Exception {
        Scenario s = scenario("Seguro");
        String body="{\"resourceId\":\""+s.resourceId()+"\",\"expectedVersion\":0,\"requestId\":\""+UUID.randomUUID()+"\"}";
        assertThat(request(HttpClient.newHttpClient(),"POST","/api/sessions/"+s.sessionId()+"/material-presentation",body)
                .statusCode()).isIn(401,403);
        assertThat(request(HttpClient.newHttpClient(),"GET",
                "/api/sessions/"+s.sessionId()+"/material-presentation",null).statusCode()).isEqualTo(401);

        CookieManager cookies=new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        HttpClient authenticated=HttpClient.newBuilder().cookieHandler(cookies).build();
        var csrfResponse = request(authenticated,"GET","/api/auth/csrf",null);
        String token=csrfResponse.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
        assertThat(token).isNotBlank();
        var loginRequest=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/auth/login"))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"username\":\"material-teacher\",\"password\":\"material-password\"}")).build();
        assertThat(authenticated.send(loginRequest,HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(200);
        assertThat(request(authenticated,"POST",
                "/api/sessions/"+s.sessionId()+"/material-presentation",body).statusCode()).isEqualTo(403);
        // Even with a session cookie, mutation without CSRF is blocked.
        assertThat(jdbc.queryForObject("select count(*) from arena_material_publications where session_id=?",
                Integer.class,s.sessionId())).isZero();

        var allowedRequest=HttpRequest.newBuilder(URI.create(
                "http://localhost:"+port+"/api/sessions/"+s.sessionId()+"/material-presentation"))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var allowed=authenticated.send(allowedRequest,HttpResponse.BodyHandlers.ofString());
        assertThat(allowed.statusCode()).isEqualTo(201);
        assertThat(allowed.body()).contains("ACTIVE");
        assertThat(jdbc.queryForObject("select count(*) from arena_material_publications where session_id=?",
                Integer.class,s.sessionId())).isEqualTo(1);

        UUID publicationId=publications.current(s.sessionId()).id();
        String navBody="{\"publicationId\":\""+publicationId+"\",\"anchor\":null,"
                +"\"expectedVersion\":1,\"requestId\":\""+UUID.randomUUID()+"\"}";
        String navPath="/api/sessions/"+s.sessionId()+"/material-presentation/section";
        assertThat(request(HttpClient.newHttpClient(),"PUT",navPath,navBody).statusCode()).isIn(401,403);
        assertThat(request(authenticated,"PUT",navPath,navBody).statusCode()).isEqualTo(403);
        var navigateRequest=HttpRequest.newBuilder(URI.create("http://localhost:"+port+navPath))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .PUT(HttpRequest.BodyPublishers.ofString(navBody)).build();
        var navigation=authenticated.send(navigateRequest,HttpResponse.BodyHandlers.ofString());
        assertThat(navigation.statusCode()).isEqualTo(200);
        assertThat(navigation.body()).contains("\"stageVersion\":2");

        Scenario unsafe = scenario("<script>alert('inseguro')</script>");
        String unsafeBody="{\"resourceId\":\""+unsafe.resourceId()+"\",\"expectedVersion\":0,"
                +"\"requestId\":\""+UUID.randomUUID()+"\"}";
        var rejectedRequest=HttpRequest.newBuilder(URI.create(
                "http://localhost:"+port+"/api/sessions/"+unsafe.sessionId()+"/material-presentation"))
                .header("Content-Type","application/json").header("X-XSRF-TOKEN",token)
                .POST(HttpRequest.BodyPublishers.ofString(unsafeBody)).build();
        var rejected=authenticated.send(rejectedRequest,HttpResponse.BodyHandlers.ofString());
        assertThat(rejected.statusCode()).isEqualTo(422);
        assertThat(rejected.body()).contains("HTML ativo ou imagem fora de um bloco de código")
                .doesNotContain("inseguro");

    }
}
