package br.com.arenadev.integration.provider.microsoft;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class HttpMicrosoftGraphEducationClient implements MicrosoftGraphEducationClient {
    private static final String CLASSES_FIRST_PAGE = "/education/classes";

    private final RestClient client;

    public HttpMicrosoftGraphEducationClient() {
        this(RestClient.builder()
                .baseUrl("https://graph.microsoft.com/v1.0")
                .build());
    }

    HttpMicrosoftGraphEducationClient(RestClient client) {
        this.client = client;
    }

    @Override
    public List<MicrosoftEducationClass> listClasses(String accessToken) {
        requireToken(accessToken);

        var result = new ArrayList<MicrosoftEducationClass>();
        String next = CLASSES_FIRST_PAGE;

        while (next != null && !next.isBlank()) {
            var page = getClassPage(accessToken, next);
            if (page.value() != null) {
                page.value().stream()
                        .map(ClassPayload::toDomain)
                        .forEach(result::add);
            }
            next = page.nextLink();
        }

        return List.copyOf(result);
    }

    @Override
    public List<MicrosoftEducationUser> listClassMembers(
            String accessToken,
            String microsoftClassId
    ) {
        requireToken(accessToken);
        String classId = required(microsoftClassId, "microsoftClassId");

        var result = new ArrayList<MicrosoftEducationUser>();
        String next = "/education/classes/" + classId + "/members";

        while (next != null && !next.isBlank()) {
            var page = getMemberPage(accessToken, next);
            if (page.value() != null) {
                page.value().stream()
                        .map(UserPayload::toDomain)
                        .forEach(result::add);
            }
            next = page.nextLink();
        }

        return List.copyOf(result);
    }

    @Override
    public List<MicrosoftEducationAssignment> listClassAssignments(
            String accessToken,
            String microsoftClassId
    ) {
        requireToken(accessToken);
        String classId = required(microsoftClassId, "microsoftClassId");

        var result = new ArrayList<MicrosoftEducationAssignment>();
        String next = "/education/classes/" + classId
                + "/assignments?$select=id,classId,displayName,status,assignedDateTime,dueDateTime,webUrl";

        while (next != null && !next.isBlank()) {
            var page = getAssignmentPage(accessToken, next);
            if (page.value() != null) {
                page.value().stream()
                        .map(AssignmentPayload::toDomain)
                        .forEach(result::add);
            }
            next = page.nextLink();
        }

        return List.copyOf(result);
    }

    @Override
    public List<MicrosoftEducationSubmission> listAssignmentSubmissions(
            String accessToken,
            String microsoftClassId,
            String microsoftAssignmentId
    ) {
        requireToken(accessToken);
        String classId = required(microsoftClassId, "microsoftClassId");
        String assignmentId = required(
                microsoftAssignmentId,
                "microsoftAssignmentId"
        );

        var result = new ArrayList<MicrosoftEducationSubmission>();
        String next = "/education/classes/" + classId
                + "/assignments/" + assignmentId
                + "/submissions?$select=id,assignmentId,recipient,status,submittedDateTime,returnedDateTime,reassignedDateTime,webUrl";

        while (next != null && !next.isBlank()) {
            var page = getSubmissionPage(accessToken, next);
            if (page.value() != null) {
                page.value().stream()
                        .map(SubmissionPayload::toDomain)
                        .forEach(result::add);
            }
            next = page.nextLink();
        }

        return List.copyOf(result);
    }

    private ClassPage getClassPage(String accessToken, String location) {
        try {
            var page = request(accessToken, location).body(ClassPage.class);
            if (page == null) {
                throw new MicrosoftGraphConnectionException(
                        "Microsoft Graph retornou resposta vazia ao listar turmas."
                );
            }
            return page;
        } catch (RestClientResponseException error) {
            throw graphFailure("listar turmas", error);
        }
    }

    private MemberPage getMemberPage(String accessToken, String location) {
        try {
            var page = request(accessToken, location).body(MemberPage.class);
            if (page == null) {
                throw new MicrosoftGraphConnectionException(
                        "Microsoft Graph retornou resposta vazia ao listar membros da turma."
                );
            }
            return page;
        } catch (RestClientResponseException error) {
            throw graphFailure("listar membros da turma", error);
        }
    }

    private AssignmentPage getAssignmentPage(String accessToken, String location) {
        try {
            var page = request(accessToken, location).body(AssignmentPage.class);
            if (page == null) {
                throw new MicrosoftGraphConnectionException(
                        "Microsoft Graph retornou resposta vazia ao listar assignments."
                );
            }
            return page;
        } catch (RestClientResponseException error) {
            throw graphFailure("listar assignments da turma", error);
        }
    }

    @Override
    public List<MicrosoftEducationOutcome> listSubmissionOutcomes(
            String accessToken,
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId
    ) {
        requireToken(accessToken);
        String classId = required(microsoftClassId, "microsoftClassId");
        String assignmentId = required(microsoftAssignmentId, "microsoftAssignmentId");
        String submissionId = required(microsoftSubmissionId, "microsoftSubmissionId");

        var result = new ArrayList<MicrosoftEducationOutcome>();
        String next = "/education/classes/" + classId
                + "/assignments/" + assignmentId
                + "/submissions/" + submissionId
                + "/outcomes";

        while (next != null && !next.isBlank()) {
            var page = getOutcomePage(accessToken, next);
            if (page.value() != null) {
                page.value().stream()
                        .map(OutcomePayload::toDomain)
                        .forEach(result::add);
            }
            next = page.nextLink();
        }

        return List.copyOf(result);
    }

    @Override
    public void updatePointsOutcome(
            String accessToken,
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId,
            String outcomeId,
            java.math.BigDecimal points
    ) {
        requireToken(accessToken);
        String location = outcomeLocation(
                microsoftClassId,
                microsoftAssignmentId,
                microsoftSubmissionId,
                outcomeId
        );

        try {
            client.patch()
                    .uri(location)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .body(Map.of(
                            "@odata.type", "#microsoft.graph.educationPointsOutcome",
                            "points", Map.of(
                                    "@odata.type", "#microsoft.graph.educationAssignmentPointsGrade",
                                    "points", points
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException error) {
            throw graphFailure("atualizar pontuação da submission", error);
        }
    }

    @Override
    public void updateFeedbackOutcome(
            String accessToken,
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId,
            String outcomeId,
            String feedback
    ) {
        requireToken(accessToken);
        String location = outcomeLocation(
                microsoftClassId,
                microsoftAssignmentId,
                microsoftSubmissionId,
                outcomeId
        );

        try {
            client.patch()
                    .uri(location)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .body(Map.of(
                            "@odata.type", "#microsoft.graph.educationFeedbackOutcome",
                            "feedback", Map.of(
                                    "text", Map.of(
                                            "content", required(feedback, "feedback"),
                                            "contentType", "text"
                                    )
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException error) {
            throw graphFailure("atualizar feedback da submission", error);
        }
    }

    @Override
    public void returnSubmission(
            String accessToken,
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId
    ) {
        requireToken(accessToken);
        String classId = required(microsoftClassId, "microsoftClassId");
        String assignmentId = required(microsoftAssignmentId, "microsoftAssignmentId");
        String submissionId = required(microsoftSubmissionId, "microsoftSubmissionId");

        String location = "/education/classes/" + classId
                + "/assignments/" + assignmentId
                + "/submissions/" + submissionId
                + "/return";

        try {
            client.post()
                    .uri(location)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException error) {
            throw graphFailure("devolver submission ao aluno", error);
        }
    }

    private String outcomeLocation(
            String microsoftClassId,
            String microsoftAssignmentId,
            String microsoftSubmissionId,
            String outcomeId
    ) {
        String classId = required(microsoftClassId, "microsoftClassId");
        String assignmentId = required(microsoftAssignmentId, "microsoftAssignmentId");
        String submissionId = required(microsoftSubmissionId, "microsoftSubmissionId");
        String outcome = required(outcomeId, "outcomeId");

        return "/education/classes/" + classId
                + "/assignments/" + assignmentId
                + "/submissions/" + submissionId
                + "/outcomes/" + outcome;
    }

    private SubmissionPage getSubmissionPage(String accessToken, String location) {
        try {
            var page = request(accessToken, location).body(SubmissionPage.class);
            if (page == null) {
                throw new MicrosoftGraphConnectionException(
                        "Microsoft Graph retornou resposta vazia ao listar submissions."
                );
            }
            return page;
        } catch (RestClientResponseException error) {
            throw graphFailure("listar submissions da assignment", error);
        }
    }

    private OutcomePage getOutcomePage(String accessToken, String location) {
        try {
            var page = request(accessToken, location).body(OutcomePage.class);
            if (page == null) {
                throw new MicrosoftGraphConnectionException(
                        "Microsoft Graph retornou resposta vazia ao listar outcomes."
                );
            }
            return page;
        } catch (RestClientResponseException error) {
            throw graphFailure("listar avaliação da submission", error);
        }
    }

    private RestClient.ResponseSpec request(String accessToken, String location) {
        var request = client.get();
        var response = location.startsWith("http://") || location.startsWith("https://")
                ? request.uri(URI.create(location))
                : request.uri(location);

        return response
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve();
    }

    private MicrosoftGraphConnectionException graphFailure(
            String action,
            RestClientResponseException error
    ) {
        return new MicrosoftGraphConnectionException(
                "Falha ao " + action + " no Microsoft Graph. HTTP "
                        + error.getStatusCode().value()
        );
    }

    private static void requireToken(String accessToken) {
        required(accessToken, "accessToken");
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }

    record ClassPage(
            List<ClassPayload> value,
            @JsonProperty("@odata.nextLink") String nextLink
    ) {}

    record MemberPage(
            List<UserPayload> value,
            @JsonProperty("@odata.nextLink") String nextLink
    ) {}

    record AssignmentPage(
            List<AssignmentPayload> value,
            @JsonProperty("@odata.nextLink") String nextLink
    ) {}

    record SubmissionPage(
            List<SubmissionPayload> value,
            @JsonProperty("@odata.nextLink") String nextLink
    ) {}

    record OutcomePage(
            List<OutcomePayload> value,
            @JsonProperty("@odata.nextLink") String nextLink
    ) {}

    record ClassPayload(
            String id,
            String displayName,
            String classCode,
            String externalId,
            String externalName,
            String description,
            String grade
    ) {
        MicrosoftEducationClass toDomain() {
            return new MicrosoftEducationClass(
                    id,
                    displayName,
                    classCode,
                    externalId,
                    externalName,
                    description,
                    grade
            );
        }
    }

    record UserPayload(
            String id,
            String displayName,
            String givenName,
            String surname,
            String userPrincipalName,
            String primaryRole,
            EducationRolePayload student,
            EducationRolePayload teacher
    ) {
        MicrosoftEducationUser toDomain() {
            return new MicrosoftEducationUser(
                    id,
                    displayName,
                    givenName,
                    surname,
                    userPrincipalName,
                    primaryRole,
                    resolveExternalId()
            );
        }

        private String resolveExternalId() {
            if ("student".equalsIgnoreCase(primaryRole) && student != null) {
                return student.externalId();
            }
            if ("teacher".equalsIgnoreCase(primaryRole) && teacher != null) {
                return teacher.externalId();
            }
            if (student != null && student.externalId() != null) {
                return student.externalId();
            }
            return teacher == null ? null : teacher.externalId();
        }
    }

    record AssignmentPayload(
            String id,
            String classId,
            String displayName,
            String status,
            java.time.OffsetDateTime assignedDateTime,
            java.time.OffsetDateTime dueDateTime,
            String webUrl
    ) {
        MicrosoftEducationAssignment toDomain() {
            return new MicrosoftEducationAssignment(
                    id,
                    classId,
                    displayName,
                    status,
                    assignedDateTime,
                    dueDateTime,
                    webUrl
            );
        }
    }

    record SubmissionPayload(
            String id,
            String assignmentId,
            SubmissionRecipientPayload recipient,
            String status,
            java.time.OffsetDateTime submittedDateTime,
            java.time.OffsetDateTime returnedDateTime,
            java.time.OffsetDateTime reassignedDateTime,
            String webUrl
    ) {
        MicrosoftEducationSubmission toDomain() {
            return new MicrosoftEducationSubmission(
                    id,
                    assignmentId,
                    recipient == null ? null : recipient.userId(),
                    status,
                    submittedDateTime,
                    returnedDateTime,
                    reassignedDateTime,
                    webUrl
            );
        }
    }

    record OutcomePayload(
            String id,
            @JsonProperty("@odata.type") String odataType,
            PointsGradePayload points,
            PointsGradePayload publishedPoints,
            FeedbackPayload feedback,
            FeedbackPayload publishedFeedback,
            java.time.OffsetDateTime lastModifiedDateTime
    ) {
        MicrosoftEducationOutcome toDomain() {
            return new MicrosoftEducationOutcome(
                    id,
                    odataType,
                    points == null ? null : points.points(),
                    publishedPoints == null ? null : publishedPoints.points(),
                    feedback == null ? null : feedback.content(),
                    publishedFeedback == null ? null : publishedFeedback.content(),
                    lastModifiedDateTime
            );
        }
    }

    record PointsGradePayload(java.math.BigDecimal points) {}

    record FeedbackPayload(TextPayload text) {
        String content() {
            return text == null ? null : text.content();
        }
    }

    record TextPayload(String content, String contentType) {}

    record SubmissionRecipientPayload(String userId) {}

    record EducationRolePayload(String externalId) {}
}
