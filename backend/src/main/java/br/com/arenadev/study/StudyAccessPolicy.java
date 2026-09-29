package br.com.arenadev.study;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.journey.Journey;
import br.com.arenadev.journey.JourneyStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudyAccessPolicy {
    private final EnrollmentRepository enrollments;

    public StudyAccessPolicy(EnrollmentRepository enrollments) {
        this.enrollments = enrollments;
    }

    public boolean canAccessClassroomStudy(Enrollment enrollment) {
        return enrollment.isActive() && enrollment.getClassroom().isStudentStudyAccessEnabled();
    }

    public boolean canAccessJourney(Journey journey, StudyPrincipal principal) {
        return journey.getStatus() == JourneyStatus.PUBLISHED
                && enrollmentFor(journey, principal).filter(this::canAccessClassroomStudy).isPresent();
    }

    public Enrollment requireJourneyAccess(Journey journey, StudyPrincipal principal) {
        if (journey.getStatus() != JourneyStatus.PUBLISHED) {
            throw notFound();
        }
        return enrollmentFor(journey, principal)
                .filter(this::canAccessClassroomStudy)
                .orElseThrow(StudyAccessPolicy::notFound);
    }

    private java.util.Optional<Enrollment> enrollmentFor(Journey journey, StudyPrincipal principal) {
        return enrollments.findByStudentIdAndClassroomIdAndActiveTrue(
                principal.userId(), journey.getClassroom().getId()
        );
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Jornada não encontrada.");
    }
}
