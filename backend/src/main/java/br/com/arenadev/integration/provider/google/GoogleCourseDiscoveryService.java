package br.com.arenadev.integration.provider.google;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class GoogleCourseDiscoveryService {
    private final IntegrationConnectionService connections;
    private final GoogleClassroomTokenProvider tokens;
    private final GoogleClassroomApiClient classroom;
    public GoogleCourseDiscoveryService(IntegrationConnectionService connections, GoogleClassroomTokenProvider tokens, GoogleClassroomApiClient classroom){
        this.connections=connections; this.tokens=tokens; this.classroom=classroom;
    }
    @Transactional(readOnly=true)
    public DiscoveryResult discover(UUID connectionId){
        var c=connections.required(connectionId);
        if(c.getProvider()!=LearningPlatformProvider.GOOGLE_CLASSROOM) throw new IllegalArgumentException("A conexão informada não pertence ao provider GOOGLE_CLASSROOM.");
        if(c.getStatus()!=IntegrationConnectionStatus.ACTIVE) throw new IllegalStateException("A conexão Google Classroom precisa estar ACTIVE para descobrir turmas.");
        var courses=classroom.listCourses(tokens.acquire(connectionId).token());
        return new DiscoveryResult(connectionId,c.getDisplayName(),courses);
    }
    public record DiscoveryResult(UUID connectionId,String connectionName,List<GoogleClassroomCourse> courses){
        public DiscoveryResult { courses=List.copyOf(courses); }
        public int count(){ return courses.size(); }
    }
}
