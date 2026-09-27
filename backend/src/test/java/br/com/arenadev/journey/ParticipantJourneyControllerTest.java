package br.com.arenadev.journey;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ParticipantJourneyControllerTest {
    @Test
    void resolvesParticipantEnrollmentBeforeReturningPublishedJourneys() {
        SessionJoinService joinService = mock(SessionJoinService.class);
        EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
        JourneyService journeys = mock(JourneyService.class);
        SessionParticipant participant = mock(SessionParticipant.class);
        Student student = mock(Student.class);
        Enrollment enrollment = mock(Enrollment.class);

        UUID sessionId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        var session = new SessionJoinService.PublicSessionView(
                sessionId, classroomId, "Turma", "Aula", "ABC123", Instant.now().plusSeconds(600)
        );
        when(joinService.lookup("ABC123")).thenReturn(session);
        when(joinService.validateParticipantToken(sessionId, "participant-token")).thenReturn(participant);
        when(participant.getStudent()).thenReturn(student);
        when(student.getId()).thenReturn(studentId);
        when(enrollments.findByClassroomIdAndStudentId(classroomId, studentId)).thenReturn(Optional.of(enrollment));
        when(enrollment.isActive()).thenReturn(true);
        when(enrollment.getId()).thenReturn(enrollmentId);
        when(journeys.publishedForEnrollment(classroomId, enrollmentId)).thenReturn(List.of());

        var controller = new ParticipantJourneyController(joinService, enrollments, journeys);
        var result = controller.list("ABC123", "participant-token");

        assertThat(result).isEmpty();
        verify(journeys).publishedForEnrollment(classroomId, enrollmentId);
    }
}
