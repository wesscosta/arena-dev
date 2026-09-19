package br.com.arenadev.integration.provider.microsoft;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

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

    record EducationRolePayload(String externalId) {}
}
