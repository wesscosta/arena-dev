package br.com.arenadev.integration.application;

import br.com.arenadev.integration.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class ExternalLinkService {
    private final IntegrationConnectionRepository connections;
    private final ExternalClassroomLinkRepository classrooms;
    private final ExternalStudentLinkRepository students;
    private final ExternalActivityLinkRepository activities;
    private final ExternalSubmissionLinkRepository submissions;
    private final Clock clock;

    @Autowired
    public ExternalLinkService(
            IntegrationConnectionRepository connections,
            ExternalClassroomLinkRepository classrooms,
            ExternalStudentLinkRepository students,
            ExternalActivityLinkRepository activities,
            ExternalSubmissionLinkRepository submissions
    ) {
        this(connections, classrooms, students, activities, submissions, Clock.systemUTC());
    }

    ExternalLinkService(
            IntegrationConnectionRepository connections,
            ExternalClassroomLinkRepository classrooms,
            ExternalStudentLinkRepository students,
            ExternalActivityLinkRepository activities,
            ExternalSubmissionLinkRepository submissions,
            Clock clock
    ) {
        this.connections = connections;
        this.classrooms = classrooms;
        this.students = students;
        this.activities = activities;
        this.submissions = submissions;
        this.clock = clock;
    }

    public ExternalClassroomLinkEntity linkClassroom(
            UUID connectionId, UUID classroomId, String externalClassroomId, String externalWebUrl
    ) {
        requireConnection(connectionId);
        return classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId)
                .orElseGet(() -> classrooms.save(new ExternalClassroomLinkEntity(
                        UUID.randomUUID(), connectionId, classroomId, externalClassroomId, externalWebUrl, now()
                )));
    }

    public ExternalStudentLinkEntity linkStudent(
            UUID connectionId, UUID externalClassroomLinkId, UUID enrollmentId, String externalUserId
    ) {
        requireConnection(connectionId);
        requireClassroom(connectionId, externalClassroomLinkId);
        return students.findByConnectionIdAndEnrollmentId(connectionId, enrollmentId)
                .orElseGet(() -> students.save(new ExternalStudentLinkEntity(
                        UUID.randomUUID(), connectionId, externalClassroomLinkId, enrollmentId, externalUserId, now()
                )));
    }

    public ExternalActivityLinkEntity linkActivity(
            UUID connectionId, UUID externalClassroomLinkId, UUID activityId,
            String externalActivityId, String externalWebUrl
    ) {
        requireConnection(connectionId);
        requireClassroom(connectionId, externalClassroomLinkId);
        return activities.findByConnectionIdAndActivityId(connectionId, activityId)
                .orElseGet(() -> activities.save(new ExternalActivityLinkEntity(
                        UUID.randomUUID(), connectionId, externalClassroomLinkId, activityId,
                        externalActivityId, externalWebUrl, now()
                )));
    }

    public ExternalSubmissionLinkEntity linkSubmission(
            UUID connectionId, UUID externalActivityLinkId, UUID externalStudentLinkId,
            UUID submissionId, String externalSubmissionId
    ) {
        requireConnection(connectionId);
        var activity = activities.findById(externalActivityLinkId)
                .filter(it -> it.getConnectionId().equals(connectionId))
                .orElseThrow(() -> new IntegrationNotFoundException("Vínculo externo de atividade inválido."));
        if (externalStudentLinkId != null) {
            students.findById(externalStudentLinkId)
                    .filter(it -> it.getConnectionId().equals(connectionId))
                    .orElseThrow(() -> new IntegrationNotFoundException("Vínculo externo de estudante inválido."));
        }
        return submissions.findByConnectionIdAndSubmissionId(connectionId, submissionId)
                .orElseGet(() -> submissions.save(new ExternalSubmissionLinkEntity(
                        UUID.randomUUID(), connectionId, activity.getId(), externalStudentLinkId,
                        submissionId, externalSubmissionId, now()
                )));
    }

    private void requireConnection(UUID connectionId) {
        if (!connections.existsById(connectionId)) {
            throw new IntegrationNotFoundException("Conexão não encontrada: " + connectionId);
        }
    }

    private ExternalClassroomLinkEntity requireClassroom(UUID connectionId, UUID linkId) {
        return classrooms.findById(linkId)
                .filter(it -> it.getConnectionId().equals(connectionId))
                .orElseThrow(() -> new IntegrationNotFoundException("Vínculo externo de turma inválido."));
    }

    private Instant now() { return clock.instant(); }
}
