package br.com.arenadev.integration.provider.google;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class HttpGoogleClassroomApiClient implements GoogleClassroomApiClient {
    private final RestClient client;
    public HttpGoogleClassroomApiClient() { this(RestClient.builder().baseUrl("https://classroom.googleapis.com").build()); }
    HttpGoogleClassroomApiClient(RestClient client) { this.client = client; }

    public List<GoogleClassroomCourse> listCourses(String accessToken) {
        String token = required(accessToken, "accessToken");
        var result = new ArrayList<GoogleClassroomCourse>();
        String pageToken = null;
        do {
            String uri = "/v1/courses?courseStates=ACTIVE&pageSize=100";
            if (pageToken != null && !pageToken.isBlank()) uri += "&pageToken=" + URLEncoder.encode(pageToken, StandardCharsets.UTF_8);
            CoursePage page;
            try {
                page = client.get().uri(uri).headers(h -> h.setBearerAuth(token)).retrieve().body(CoursePage.class);
            } catch (RestClientResponseException e) {
                throw new GoogleClassroomConnectionException("Falha ao listar turmas no Google Classroom. HTTP " + e.getStatusCode().value(), e);
            }
            if (page == null) throw new GoogleClassroomConnectionException("Google Classroom retornou resposta vazia ao listar turmas.");
            if (page.courses() != null) page.courses().stream().map(CoursePayload::toDomain).forEach(result::add);
            pageToken = page.nextPageToken();
        } while (pageToken != null && !pageToken.isBlank());
        return List.copyOf(result);
    }
    private static String required(String v,String f){ if(v==null||v.isBlank()) throw new IllegalArgumentException(f+" é obrigatório."); return v.trim(); }
    record CoursePage(List<CoursePayload> courses,String nextPageToken){}
    record CoursePayload(String id,String name,String section,String descriptionHeading,String room,String courseState,String alternateLink,String ownerId){
        GoogleClassroomCourse toDomain(){ return new GoogleClassroomCourse(id,name,section,descriptionHeading,room,courseState,alternateLink,ownerId); }
    }
}
