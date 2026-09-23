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
        String externalId = required(externalClassroomId, "externalClassroomId");

        var byLocal = classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId);
        if (byLocal.isPresent()) {
            var existing = byLocal.get();
            if (!existing.getExternalClassroomId().equals(externalId)) {
                throw new IntegrationConflictException(
                        "A turma local já está vinculada a outra turma externa nesta conexão."
                );
            }
            return existing;
        }

        var byExternal = classrooms.findByConnectionIdAndExternalClassroomId(connectionId, externalId);
        if (byExternal.isPresent()) {
            var existing = byExternal.get();
            if (!existing.getClassroomId().equals(classroomId)) {
                throw new IntegrationConflictException(
                        "A turma externa já está vinculada a outra turma local nesta conexão."
                );
            }
            return existing;
        }

        return classrooms.save(new ExternalClassroomLinkEntity(
                UUID.randomUUID(), connectionId, classroomId, externalId, externalWebUrl, now()
        ));
    }

    public ExternalStudentLinkEntity linkStudent(
            UUID connectionId, UUID externalClassroomLinkId, UUID enrollmentId, String externalUserId
    ) {
        requireConnection(connectionId);
        requireClassroom(connectionId, externalClassroomLinkId);
        String externalId = required(externalUserId, "externalUserId");

        var byEnrollment = students.findByConnectionIdAndEnrollmentId(connectionId, enrollmentId);
        if (byEnrollment.isPresent()) {
            var existing = byEnrollment.get();
            if (!existing.getExternalClassroomLinkId().equals(externalClassroomLinkId)
                    || !existing.getExternalUserId().equals(externalId)) {
                throw new IntegrationConflictException(
                        "A matrícula local já está vinculada a outro usuário externo nesta conexão."
                );
            }
            return existing;
        }

        var byExternal = students
                .findByConnectionIdAndExternalClassroomLinkIdAndExternalUserId(
                        connectionId,
                        externalClassroomLinkId,
                        externalId
                );

        if (byExternal.isPresent()) {
            var existing = byExternal.get();
            if (!existing.getEnrollmentId().equals(enrollmentId)) {
                throw new IntegrationConflictException(
                        "O usuário externo já está vinculado a outra matrícula local nesta turma."
                );
            }
            return existing;
        }

        return students.save(new ExternalStudentLinkEntity(
                UUID.randomUUID(),
                connectionId,
                externalClassroomLinkId,
                enrollmentId,
                externalId,
                now()
        ));
    }

    public ExternalActivityLinkEntity linkActivity(
            UUID connectionId, UUID externalClassroomLinkId, UUID activityId,
            String externalActivityId, String externalWebUrl
    ) {
        requireConnection(connectionId);
        requireClassroom(connectionId, externalClassroomLinkId);
        String externalId = required(externalActivityId, "externalActivityId");

        var byLocal = activities.findByConnectionIdAndActivityId(connectionId, activityId);
        if (byLocal.isPresent()) {
            var existing = byLocal.get();
            if (!existing.getExternalClassroomLinkId().equals(externalClassroomLinkId)
                    || !existing.getExternalActivityId().equals(externalId)) {
                throw new IntegrationConflictException(
                        "A atividade local já está vinculada a outra atividade externa nesta conexão."
                );
            }
            return existing;
        }

        var byExternal = activities.findByConnectionIdAndExternalActivityId(
                connectionId,
                externalId
        );

        if (byExternal.isPresent()) {
            var existing = byExternal.get();
            if (!existing.getActivityId().equals(activityId)) {
                throw new IntegrationConflictException(
                        "A atividade externa já está vinculada a outra atividade local nesta conexão."
                );
            }
            return existing;
        }

        return activities.save(new ExternalActivityLinkEntity(
                UUID.randomUUID(),
                connectionId,
                externalClassroomLinkId,
                activityId,
                externalId,
                externalWebUrl,
                now()
        ));
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
        String externalId = required(externalSubmissionId, "externalSubmissionId");

        var byLocal = submissions.findByConnectionIdAndSubmissionId(connectionId, submissionId);
        if (byLocal.isPresent()) {
            var existing = byLocal.get();
            if (!existing.getExternalActivityLinkId().equals(activity.getId())
                    || !existing.getExternalSubmissionId().equals(externalId)) {
                throw new IntegrationConflictException(
                        "A entrega local já está vinculada a outra submissão externa nesta conexão."
                );
            }
            return existing;
        }

        var byExternal = submissions.findByConnectionIdAndExternalSubmissionId(
                connectionId,
                externalId
        );
        if (byExternal.isPresent()) {
            var existing = byExternal.get();
            if (!existing.getSubmissionId().equals(submissionId)
                    || !existing.getExternalActivityLinkId().equals(activity.getId())) {
                throw new IntegrationConflictException(
                        "A submissão externa já está vinculada a outra entrega local."
                );
            }
            return existing;
        }

        return submissions.save(new ExternalSubmissionLinkEntity(
                UUID.randomUUID(),
                connectionId,
                activity.getId(),
                externalStudentLinkId,
                submissionId,
                externalId,
                now()
        ));
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

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }

    private Instant now() { return clock.instant(); }
}
