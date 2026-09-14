
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class ActivitySubmissionService {
    private final ActivityRepository activityRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ActivitySubmissionRepository submissionRepository;

    public ActivitySubmissionService(ActivityRepository activityRepository, EnrollmentRepository enrollmentRepository, ActivitySubmissionRepository submissionRepository) {
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public ActivitySubmission start(UUID activityId, UUID enrollmentId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> notFound("Atividade não encontrada."));
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> notFound("Matrícula não encontrada."));

        if (!enrollment.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Matrícula inativa.");
        }
        if (!activity.getClassroom().getId().equals(enrollment.getClassroom().getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A matrícula não pertence à turma da atividade.");
        }

        return submissionRepository
                .findByActivityIdAndEnrollmentIdAndAttemptNumber(activityId, enrollmentId, 1)
                .orElseGet(() -> submissionRepository.save(new ActivitySubmission(activity, enrollment, 1, SubmissionSource.ARENA)));
    }

    @Transactional(readOnly = true)
    public ActivitySubmission get(UUID activityId, UUID submissionId) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> notFound("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)) {
            throw notFound("Entrega não encontrada para esta atividade.");
        }
        return submission;
    }

    @Transactional(readOnly = true)
    public List<ActivitySubmission> list(UUID activityId) {
        if (!activityRepository.existsById(activityId)) {
            throw notFound("Atividade não encontrada.");
        }
        return submissionRepository.findByActivityIdOrderByUpdatedAtDesc(activityId);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
