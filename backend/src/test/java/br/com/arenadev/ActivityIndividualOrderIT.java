package br.com.arenadev;

import br.com.arenadev.activity.ActivityService;
import br.com.arenadev.activity.ActivityService.ActivityInput;
import br.com.arenadev.activity.ActivityService.ActivityView;
import br.com.arenadev.activity.ActivityService.QuestionInput;
import br.com.arenadev.activity.ActivityService.QuestionOptionInput;
import br.com.arenadev.activity.QuestionDifficulty;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.submission.IndividualOrder;
import br.com.arenadev.support.SharedPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Ordem individual por tentativa nas rotas do participante e trava depois do início. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.teacher.username=order-teacher",
                "app.teacher.password=order-password"
        }
)
class ActivityIndividualOrderIT {
    private static final List<String> TEXTS = List.of("Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ActivityIndividualOrderIT.class);
    }

    @LocalServerPort
    private int port;

    @Autowired
    private ClassroomService classroomService;

    @Autowired
    private StudentService studentService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionJoinService joinService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JsonMapper json;

    private HttpClient teacher;
    private String csrfToken;
    private final HttpClient participant = HttpClient.newHttpClient();

    @BeforeEach
    void authenticateTeacher() throws Exception {
        CookieManager cookies = new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        teacher = HttpClient.newBuilder().cookieHandler(cookies).build();
        HttpResponse<String> csrf = teacherSend("GET", "/api/auth/csrf", null);
        csrfToken = csrf.body().replaceFirst(".*\\\"token\\\":\\\"([^\\\"]+)\\\".*", "$1");
        assertThat(teacherSend("POST", "/api/auth/login",
                "{\"username\":\"order-teacher\",\"password\":\"order-password\"}").statusCode()).isEqualTo(200);
    }

    @Test
    void offKeepsTheOriginalOrderOfOptionsAndQuestions() throws Exception {
        Fixture fixture = fixture(false, false);
        Map<String, Object> card = start(fixture, fixture.tokens().getFirst());

        assertThat(statements(card)).containsExactly("Questão 1", "Questão 2", "Questão 3", "Verdadeiro ou falso");
        for (Map<String, Object> question : multipleChoice(card)) assertThat(texts(question)).isEqualTo(TEXTS);
    }

    @Test
    void onShufflesOptionsPerAttemptStablyAndKeepsTrueFalseAndQuestionOrder() throws Exception {
        Fixture fixture = fixture(true, false);
        Map<String, Object> first = start(fixture, fixture.tokens().getFirst());
        UUID submissionId = UUID.fromString((String) first.get("submissionId"));

        assertThat(statements(first)).containsExactly("Questão 1", "Questão 2", "Questão 3", "Verdadeiro ou falso");
        Set<List<String>> orders = new HashSet<>();
        for (Map<String, Object> question : multipleChoice(first)) {
            UUID questionId = UUID.fromString((String) question.get("id"));
            List<String> expected = IndividualOrder.shuffle(TEXTS, IndividualOrder.optionSeed(submissionId, questionId));
            assertThat(texts(question)).isEqualTo(expected);
            orders.add(expected);
        }
        assertThat(orders).as("ao menos uma questão sai fora da ordem original").anySatisfy(order -> assertThat(order).isNotEqualTo(TEXTS));
        assertThat(trueFalse(first).get("options")).isNull();

        Map<String, Object> again = card(list(fixture, fixture.tokens().getFirst()), fixture.activityId());
        assertThat(multipleChoice(again).stream().map(ActivityIndividualOrderIT::texts).toList())
                .as("mesma tentativa, mesma ordem")
                .isEqualTo(multipleChoice(first).stream().map(ActivityIndividualOrderIT::texts).toList());

        Map<String, Object> other = start(fixture, fixture.tokens().get(1));
        UUID otherSubmission = UUID.fromString((String) other.get("submissionId"));
        for (Map<String, Object> question : multipleChoice(other)) {
            UUID questionId = UUID.fromString((String) question.get("id"));
            assertThat(texts(question)).isEqualTo(
                    IndividualOrder.shuffle(TEXTS, IndividualOrder.optionSeed(otherSubmission, questionId)));
        }

        Map<String, Object> question = multipleChoice(first).getFirst();
        UUID questionId = UUID.fromString((String) question.get("id"));
        String opaqueC = optionId(question, "Alternativa C");
        HttpResponse<String> saved = participantSend(fixture, fixture.tokens().getFirst(), "PUT",
                "/" + fixture.activityId() + "/submissions/" + submissionId + "/items/" + UUID.randomUUID(),
                json.writeValueAsString(Map.of("kind", "QUESTION_RESPONSE", "questionId", questionId, "position", 0,
                        "content", Map.of("value", opaqueC))));
        assertThat(saved.statusCode()).as(saved.body()).isEqualTo(200);
        assertThat(jdbc.queryForObject("select content_json from submission_items where submission_id = ? and question_id = ?",
                String.class, submissionId, questionId)).contains("\"value\":\"C\"");
    }

    @Test
    void questionOrderShufflesQuestionsStablyPerAttempt() throws Exception {
        Fixture fixture = fixture(true, true);
        Map<String, Object> card = start(fixture, fixture.tokens().getFirst());
        UUID submissionId = UUID.fromString((String) card.get("submissionId"));

        List<String> original = List.of("Questão 1", "Questão 2", "Questão 3", "Verdadeiro ou falso");
        List<String> expected = IndividualOrder.shuffle(original, IndividualOrder.questionSeed(submissionId));
        assertThat(statements(card)).isEqualTo(expected);
        assertThat(statements(card(list(fixture, fixture.tokens().getFirst()), fixture.activityId()))).isEqualTo(expected);
    }

    @Test
    void changingTheOrderAfterAnAttemptStartsIsRejectedWith409() throws Exception {
        Fixture fixture = fixture(false, false);
        ActivityView before = activityService.get(fixture.activityId());
        assertThat(before.orderLocked()).isFalse();

        start(fixture, fixture.tokens().getFirst());
        assertThat(activityService.get(fixture.activityId()).orderLocked()).isTrue();

        HttpResponse<String> change = teacherSend("PUT", "/api/activities/" + fixture.activityId(), body(before, true, false, before.title()));
        assertThat(change.statusCode()).isEqualTo(409);
        assertThat(change.body()).contains("A ordem individual não pode mudar depois que um aluno iniciou a atividade.");
        assertThat(activityService.get(fixture.activityId()).individualOptionOrder()).isFalse();

        HttpResponse<String> rename = teacherSend("PUT", "/api/activities/" + fixture.activityId(), body(before, null, null, "Título novo"));
        assertThat(rename.statusCode()).as(rename.body()).isEqualTo(200);
        assertThat(activityService.get(fixture.activityId()).title()).isEqualTo("Título novo");
    }

    @Test
    void questionOrderRequiresOptionOrderAndExistingActivitiesStayOff() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        UUID classroomId = classroomService.create("Turma ordem " + suffix, "O" + suffix).id();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> activityService.create(new ActivityInput(
                classroomId, "Inválida", null, 10, 0, null, List.of(), false, true
        ))).isInstanceOf(IllegalArgumentException.class);

        UUID legacy = UUID.randomUUID();
        jdbc.update("""
                insert into activities (id, classroom_id, title, points, on_time_bonus, resource_kind, created_at, updated_at)
                values (?, ?, 'Atividade antiga', 10, 0, 'INTERNAL', now(), now())
                """, legacy, classroomId);
        ActivityView view = activityService.get(legacy);
        assertThat(view.individualOptionOrder()).isFalse();
        assertThat(view.individualQuestionOrder()).isFalse();
    }

    private Fixture fixture(boolean optionOrder, boolean questionOrder) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma ordem " + suffix, "O" + suffix);
        List<String> registrations = new ArrayList<>();
        Set<UUID> present = new HashSet<>();
        for (int index = 1; index <= 2; index++) {
            var student = studentService.create(suffix + index, "Aluno " + index + " " + suffix, "Aluno " + index);
            classroomService.enroll(classroom.id(), student.id());
            registrations.add(student.registration());
            present.add(student.id());
        }
        var session = sessionService.start(classroom.id(), "Aula ordem", present);
        String code = joinService.ensureCode(session.id()).code();
        List<String> tokens = registrations.stream().map(registration -> joinService.join(code, registration).token()).toList();

        List<QuestionInput> questions = new ArrayList<>();
        IntStream.rangeClosed(1, 3).forEach(index -> questions.add(new QuestionInput(
                null, QuestionType.MULTIPLE_CHOICE, "Questão " + index, QuestionDifficulty.INTERMEDIATE, 1,
                List.of("A", "B", "C", "D").stream().map(id -> new QuestionOptionInput(id, "Alternativa " + id)).toList(),
                "B", null, null, null, null, null, null)));
        questions.add(new QuestionInput(null, QuestionType.TRUE_FALSE, "Verdadeiro ou falso", QuestionDifficulty.INTERMEDIATE, 1,
                null, true, null, null, null, null, null, null));
        var activity = activityService.create(new ActivityInput(
                classroom.id(), "Ordem individual", "Python", 10, 0, null, questions, optionOrder, questionOrder));
        return new Fixture(code, activity.id(), tokens);
    }

    private String body(ActivityView activity, Boolean optionOrder, Boolean questionOrder, String title) {
        List<QuestionInput> questions = activity.questions().stream().map(question -> new QuestionInput(
                question.id(), question.type(), question.statement(), question.difficulty(), question.points(),
                question.options() == null ? null : question.options().stream()
                        .map(option -> new QuestionOptionInput(option.id(), option.text())).toList(),
                question.answer(), question.expectedAnswer(), question.explanation(), question.code(), question.language(),
                question.expectedOutcome(), question.evaluationCriteria()
        )).toList();
        return json.writeValueAsString(new ActivityInput(activity.classroomId(), title, activity.topic(), activity.points(),
                activity.onTimeBonus(), null, questions, optionOrder, questionOrder));
    }

    private Map<String, Object> start(Fixture fixture, String token) throws Exception {
        HttpResponse<String> response = participantSend(fixture, token, "POST", "/" + fixture.activityId() + "/start", null);
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        Map<String, Object> card = json.readValue(response.body(), Map.class);
        return card;
    }

    private String list(Fixture fixture, String token) throws Exception {
        HttpResponse<String> response = participantSend(fixture, token, "GET", "", null);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> card(String listBody, UUID activityId) {
        List<Map<String, Object>> cards = json.readValue(listBody, List.class);
        return cards.stream().filter(card -> activityId.toString().equals(card.get("id"))).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> questions(Map<String, Object> card) {
        return (List<Map<String, Object>>) card.get("questions");
    }

    private static List<String> statements(Map<String, Object> card) {
        return questions(card).stream().map(question -> (String) question.get("statement")).toList();
    }

    private static List<Map<String, Object>> multipleChoice(Map<String, Object> card) {
        return questions(card).stream().filter(question -> "MULTIPLE_CHOICE".equals(question.get("type"))).toList();
    }

    private static Map<String, Object> trueFalse(Map<String, Object> card) {
        return questions(card).stream().filter(question -> "TRUE_FALSE".equals(question.get("type"))).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static List<String> texts(Map<String, Object> question) {
        return ((List<Map<String, Object>>) question.get("options")).stream().map(option -> (String) option.get("text")).toList();
    }

    @SuppressWarnings("unchecked")
    private static String optionId(Map<String, Object> question, String text) {
        return ((List<Map<String, Object>>) question.get("options")).stream()
                .filter(option -> text.equals(option.get("text"))).map(option -> (String) option.get("id"))
                .findFirst().orElseThrow();
    }

    private HttpResponse<String> participantSend(Fixture fixture, String token, String method, String path, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(
                        "http://localhost:" + port + "/api/join/" + fixture.code() + "/activities" + path))
                .header("X-Participant-Token", token)
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return participant.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> teacherSend(String method, String path, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        return teacher.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private record Fixture(String code, UUID activityId, List<String> tokens) {}
}
