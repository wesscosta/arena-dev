package br.com.arenadev;

import br.com.arenadev.activity.ActivityService;
import br.com.arenadev.activity.ActivityService.ActivityInput;
import br.com.arenadev.activity.ActivityService.QuestionInput;
import br.com.arenadev.activity.ActivityService.QuestionOptionInput;
import br.com.arenadev.activity.QuestionDifficulty;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionService;
import br.com.arenadev.submission.OptionIdCipher;
import br.com.arenadev.submission.SubmissionReviewService;
import br.com.arenadev.support.SharedPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Gabarito protegido: os endpoints de atividade do participante nunca devolvem
 * gabarito nem os ids originais das alternativas, e a resposta enviada com id
 * opaco é gravada com o id original.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ParticipantAnswerKeyIT {
    private static final List<String> ORIGINAL_IDS = List.of("A", "B", "C", "D");
    private static final List<String> FORBIDDEN = List.of(
            "answerJson", "expectedAnswer", "explanation", "evaluationCriteria", "\"answer\"",
            "Explicação secreta", "Resposta esperada secreta", "Critério secreto"
    );

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ParticipantAnswerKeyIT.class);
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
    private SubmissionReviewService reviewService;

    @Autowired
    private OptionIdCipher optionIds;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JsonMapper json;

    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void participantEndpointsNeverExposeTheAnswerKeyOrOriginalOptionIds() throws Exception {
        Fixture fixture = fixture(2);
        String token = fixture.tokens().getFirst();

        String beforeStart = get(fixture, token);
        assertNoAnswerKey(beforeStart);
        assertThat(question(card(beforeStart, fixture.activityId()), "MULTIPLE_CHOICE").get("options"))
                .as("alternativas só depois de iniciar a tentativa").isNull();

        String started = post(fixture, token, "/" + fixture.activityId() + "/start");
        assertNoAnswerKey(started);
        Map<String, Object> card = parse(started);
        UUID submissionId = UUID.fromString((String) card.get("submissionId"));
        Map<String, Object> multipleChoice = question(card, "MULTIPLE_CHOICE");
        List<String> opaqueIds = optionIdsOf(multipleChoice);
        assertThat(opaqueIds).hasSize(4).doesNotHaveDuplicates()
                .allSatisfy(id -> assertThat(id).hasSize(10).isNotIn(ORIGINAL_IDS));
        assertThat(question(card, "TRUE_FALSE").get("options")).isNull();

        assertThat(optionIdsOf(question(card(get(fixture, token), fixture.activityId()), "MULTIPLE_CHOICE")))
                .as("a mesma tentativa recebe sempre os mesmos ids").isEqualTo(opaqueIds);

        UUID questionId = UUID.fromString((String) multipleChoice.get("id"));
        String opaqueB = opaqueIdFor(multipleChoice, "Alternativa B");
        assertThat(opaqueB).isEqualTo(optionIds.opaque(submissionId, questionId, "B"));

        String saved = save(fixture, token, submissionId, questionId, opaqueB);
        assertNoAnswerKey(saved);
        assertThat(itemValue(parse(saved), questionId)).isEqualTo(opaqueB);
        assertThat(jdbc.queryForObject(
                "select content_json from submission_items where submission_id = ? and question_id = ?",
                String.class, submissionId, questionId
        )).contains("\"value\":\"B\"");

        String submitted = post(fixture, token, "/" + fixture.activityId() + "/submissions/" + submissionId + "/submit");
        assertNoAnswerKey(submitted);
        assertThat(itemValue(parse(submitted), questionId)).isEqualTo(opaqueB);

        var review = reviewService.open(fixture.activityId(), submissionId);
        Object teacherAnswer = review.items().stream()
                .filter(item -> questionId.equals(item.questionId()))
                .map(item -> ((Map<?, ?>) item.content()).get("value"))
                .findFirst().orElseThrow();
        Object expected = review.questions().stream()
                .filter(question -> question.id().equals(questionId))
                .map(SubmissionReviewService.QuestionContextView::expectedAnswer)
                .findFirst().orElseThrow();
        assertThat(teacherAnswer).as("professor vê o id original e a resposta confere").isEqualTo("B").isEqualTo(expected);

        jdbc.update("update activity_submissions set status = 'RETURNED', returned_at = now() where id = ?", submissionId);
        jdbc.update("""
                update submission_assessments set published_feedback = 'Bom trabalho.', feedback_published_at = now()
                where submission_id = ?
                """, submissionId);
        String afterFeedback = get(fixture, token);
        assertNoAnswerKey(afterFeedback);
        Map<String, Object> returned = card(afterFeedback, fixture.activityId());
        assertThat(returned.get("publishedFeedback")).isEqualTo("Bom trabalho.");
        assertThat(optionIdsOf(question(returned, "MULTIPLE_CHOICE"))).isEqualTo(opaqueIds);

        String otherToken = fixture.tokens().get(1);
        List<String> otherIds = optionIdsOf(question(
                parse(post(fixture, otherToken, "/" + fixture.activityId() + "/start")), "MULTIPLE_CHOICE"));
        assertThat(otherIds).as("outra tentativa recebe outros ids").doesNotContainAnyElementsOf(opaqueIds);
    }

    @Test
    void rejectsOptionIdsThatDoNotBelongToTheQuestionAttempt() throws Exception {
        Fixture fixture = fixture(2);
        String token = fixture.tokens().getFirst();
        Map<String, Object> card = parse(post(fixture, token, "/" + fixture.activityId() + "/start"));
        UUID submissionId = UUID.fromString((String) card.get("submissionId"));
        Map<String, Object> multipleChoice = question(card, "MULTIPLE_CHOICE");
        UUID questionId = UUID.fromString((String) multipleChoice.get("id"));

        Map<String, Object> other = parse(post(fixture, fixture.tokens().get(1), "/" + fixture.activityId() + "/start"));
        String otherAttemptId = optionIdsOf(question(other, "MULTIPLE_CHOICE")).getFirst();

        for (String invalid : List.of("B", "zzzzzzzzzz", otherAttemptId)) {
            HttpResponse<String> response = put(fixture, token, submissionId, questionId, invalid);
            assertThat(response.statusCode()).as(invalid).isEqualTo(400);
        }
        assertThat(jdbc.queryForObject(
                "select count(*) from submission_items where submission_id = ?", Integer.class, submissionId
        )).isZero();

        String cleared = save(fixture, token, submissionId, questionId, "");
        assertThat(itemValue(parse(cleared), questionId)).isEqualTo("");
    }

    private Fixture fixture(int students) {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma gabarito " + suffix, "G" + suffix);
        List<String> registrations = new ArrayList<>();
        Set<UUID> present = new java.util.HashSet<>();
        for (int index = 1; index <= students; index++) {
            var student = studentService.create(suffix + index, "Aluno " + index + " " + suffix, "Aluno " + index);
            classroomService.enroll(classroom.id(), student.id());
            registrations.add(student.registration());
            present.add(student.id());
        }
        var session = sessionService.start(classroom.id(), "Aula gabarito", present);
        String code = joinService.ensureCode(session.id()).code();
        List<String> tokens = registrations.stream().map(registration -> joinService.join(code, registration).token()).toList();

        var activity = activityService.create(new ActivityInput(classroom.id(), "Gabarito protegido", "Python", 10, 0, null, List.of(
                new QuestionInput(null, QuestionType.MULTIPLE_CHOICE, "Qual alternativa?", QuestionDifficulty.INTERMEDIATE, 2,
                        ORIGINAL_IDS.stream().map(id -> new QuestionOptionInput(id, "Alternativa " + id)).toList(),
                        "B", null, "Explicação secreta", null, null, null, null),
                new QuestionInput(null, QuestionType.TRUE_FALSE, "Verdadeiro ou falso?", QuestionDifficulty.INTERMEDIATE, 1,
                        null, true, null, "Explicação secreta", null, null, null, null),
                new QuestionInput(null, QuestionType.OPEN, "Explique.", QuestionDifficulty.INTERMEDIATE, 2,
                        null, null, "Resposta esperada secreta", "Explicação secreta", null, null, null, null),
                new QuestionInput(null, QuestionType.PRACTICAL, "Faça.", QuestionDifficulty.INTERMEDIATE, 2,
                        null, null, null, null, null, null, "Resultado", List.of("Critério secreto"))
        )));
        return new Fixture(code, activity.id(), tokens);
    }

    private void assertNoAnswerKey(String body) {
        for (String forbidden : FORBIDDEN) assertThat(body).as(forbidden).doesNotContain(forbidden);
        for (String id : ORIGINAL_IDS) {
            assertThat(body).doesNotContain("\"id\":\"" + id + "\"").doesNotContain("\"value\":\"" + id + "\"");
        }
    }

    private String get(Fixture fixture, String token) throws Exception {
        return ok(send(HttpRequest.newBuilder(uri(fixture, "")).header("X-Participant-Token", token).GET()));
    }

    private String post(Fixture fixture, String token, String path) throws Exception {
        return ok(send(HttpRequest.newBuilder(uri(fixture, path)).header("X-Participant-Token", token)
                .POST(HttpRequest.BodyPublishers.noBody())));
    }

    private String save(Fixture fixture, String token, UUID submissionId, UUID questionId, String value) throws Exception {
        return ok(put(fixture, token, submissionId, questionId, value));
    }

    private HttpResponse<String> put(Fixture fixture, String token, UUID submissionId, UUID questionId, String value) throws Exception {
        String body = json.writeValueAsString(Map.of(
                "kind", "QUESTION_RESPONSE", "questionId", questionId, "position", 1, "content", Map.of("value", value)
        ));
        return send(HttpRequest.newBuilder(uri(fixture, "/" + fixture.activityId() + "/submissions/" + submissionId
                        + "/items/" + UUID.randomUUID()))
                .header("X-Participant-Token", token)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body)));
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String ok(HttpResponse<String> response) {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        return response.body();
    }

    private URI uri(Fixture fixture, String path) {
        return URI.create("http://localhost:" + port + "/api/join/" + fixture.code() + "/activities" + path);
    }

    private Map<String, Object> parse(String body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> value = json.readValue(body, Map.class);
        return value;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> card(String listBody, UUID activityId) {
        List<Map<String, Object>> cards = json.readValue(listBody, List.class);
        return cards.stream().filter(card -> activityId.toString().equals(card.get("id"))).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> question(Map<String, Object> card, String type) {
        return ((List<Map<String, Object>>) card.get("questions")).stream()
                .filter(question -> type.equals(question.get("type"))).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static List<String> optionIdsOf(Map<String, Object> question) {
        return ((List<Map<String, Object>>) question.get("options")).stream().map(option -> (String) option.get("id")).toList();
    }

    @SuppressWarnings("unchecked")
    private static String opaqueIdFor(Map<String, Object> question, String text) {
        return ((List<Map<String, Object>>) question.get("options")).stream()
                .filter(option -> text.equals(option.get("text")))
                .map(option -> (String) option.get("id")).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static Object itemValue(Map<String, Object> card, UUID questionId) {
        return ((List<Map<String, Object>>) card.get("items")).stream()
                .filter(item -> questionId.toString().equals(item.get("questionId")))
                .map(item -> ((Map<String, Object>) item.get("content")).get("value"))
                .findFirst().orElseThrow();
    }

    private record Fixture(String code, UUID activityId, List<String> tokens) {}
}
