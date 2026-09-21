package br.com.arenadev.integration.provider.google;
import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.domain.*;
import br.com.arenadev.integration.persistence.IntegrationConnectionEntity;
import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
class GoogleCourseDiscoveryServiceTest {
 @Test void discoversCourses(){
  UUID id=UUID.randomUUID(); var connections=mock(IntegrationConnectionService.class); var tokens=mock(GoogleClassroomTokenProvider.class); var api=mock(GoogleClassroomApiClient.class); var c=mock(IntegrationConnectionEntity.class);
  when(c.getProvider()).thenReturn(LearningPlatformProvider.GOOGLE_CLASSROOM); when(c.getStatus()).thenReturn(IntegrationConnectionStatus.ACTIVE); when(c.getDisplayName()).thenReturn("Google Classroom · professor@example.com"); when(connections.required(id)).thenReturn(c);
  when(tokens.acquire(id)).thenReturn(new GoogleClassroomAccessToken("token",OffsetDateTime.now().plusHours(1)));
  when(api.listCourses("token")).thenReturn(List.of(new GoogleClassroomCourse("c1","TDS 2026","A",null,"3003","ACTIVE","https://classroom.google.com/c/c1","t1")));
  var r=new GoogleCourseDiscoveryService(connections,tokens,api).discover(id);
  assertThat(r.count()).isEqualTo(1); assertThat(r.courses().getFirst().name()).isEqualTo("TDS 2026");
 }
}
