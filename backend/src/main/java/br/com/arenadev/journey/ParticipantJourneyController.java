package br.com.arenadev.journey;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.session.SessionJoinService;
import br.com.arenadev.session.SessionParticipant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/join/{code}/journeys")
public class ParticipantJourneyController {
    private final SessionJoinService joinService;
    private final EnrollmentRepository enrollmentRepository;
    private final JourneyService journeyService;

    public ParticipantJourneyController(
            SessionJoinService joinService,
            EnrollmentRepository enrollmentRepository,
            JourneyService journeyService
    ) {
        this.joinService = joinService;
        this.enrollmentRepository = enrollmentRepository;
        this.journeyService = journeyService;
    }

    @GetMapping
    public List<JourneyService.ParticipantJourneyView> list(
            @PathVariable String code,
            @RequestHeader("X-Participant-Token") String token
    ) {
        SessionJoinService.PublicSessionView session = joinService.lookup(code);
        SessionParticipant participant = joinService.validateParticipantToken(session.sessionId(), token);
        Enrollment enrollment = enrollmentRepository
                .findByClassroomIdAndStudentId(session.classroomId(), participant.getStudent().getId())
                .filter(Enrollment::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Matrícula ativa não encontrada."));
        return journeyService.publishedForEnrollment(session.classroomId(), enrollment.getId());
    }
}
