package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationConflictException;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.persistence.ExternalStudentLinkEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MicrosoftStudentMatchingApplyService {
    private final MicrosoftStudentMatchingPreviewService previewService;
    private final ClassroomRepository classrooms;
    private final StudentRepository students;
    private final EnrollmentRepository enrollments;
    private final ExternalLinkService externalLinks;

    public MicrosoftStudentMatchingApplyService(
            MicrosoftStudentMatchingPreviewService previewService,
            ClassroomRepository classrooms,
            StudentRepository students,
            EnrollmentRepository enrollments,
            ExternalLinkService externalLinks
    ) {
        this.previewService = previewService;
        this.classrooms = classrooms;
        this.students = students;
        this.enrollments = enrollments;
        this.externalLinks = externalLinks;
    }

    @Transactional
    public ApplyResult apply(
            UUID connectionId,
            UUID classroomLinkId,
            String microsoftUserId,
            MicrosoftStudentMatchApplyAction action,
            UUID localStudentId
    ) {
        if (microsoftUserId == null || microsoftUserId.isBlank()) {
            throw new IllegalArgumentException("microsoftUserId é obrigatório.");
        }
        if (action == null) {
            throw new IllegalArgumentException("action é obrigatória.");
        }

        var preview = previewService.preview(connectionId, classroomLinkId);
        var item = preview.items().stream()
                .filter(candidate -> candidate.microsoftUserId().equals(microsoftUserId.trim()))
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Usuário Microsoft não encontrado no preview atual: " + microsoftUserId
                ));

        if (item.status() == MicrosoftStudentMatchStatus.ALREADY_LINKED) {
            return alreadyLinkedResult(item, connectionId, classroomLinkId);
        }

        if (item.status() == MicrosoftStudentMatchStatus.CONFLICT) {
            throw new IntegrationConflictException(
                    "O item está em conflito e não pode ser aplicado automaticamente."
            );
        }

        if (item.status() == MicrosoftStudentMatchStatus.IGNORED_NON_STUDENT) {
            throw new IllegalArgumentException(
                    "Somente membros Microsoft com papel student podem ser aplicados."
            );
        }

        var classroom = classrooms.findById(preview.classroomId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Turma local não encontrada: " + preview.classroomId()
                ));

        Student student = switch (action) {
            case APPLY_SUGGESTED -> resolveSuggested(item);
            case CREATE_NEW_STUDENT -> createNew(item);
            case LINK_EXISTING_STUDENT -> resolveExplicit(item, localStudentId);
        };

        Enrollment enrollment = enrollments
                .findByClassroomIdAndStudentId(preview.classroomId(), student.getId())
                .orElseGet(() -> enrollments.save(new Enrollment(classroom, student)));

        enrollment.setActive(true);

        ExternalStudentLinkEntity link = externalLinks.linkStudent(
                connectionId,
                classroomLinkId,
                enrollment.getId(),
                item.microsoftUserId()
        );

        return new ApplyResult(
                item.microsoftUserId(),
                student.getId(),
                enrollment.getId(),
                link.getId(),
                student.getName(),
                action,
                true
        );
    }

    private Student resolveSuggested(
            MicrosoftStudentMatchingPreviewService.PreviewItem item
    ) {
        if (item.status() != MicrosoftStudentMatchStatus.SAFE_MATCH
                && item.status() != MicrosoftStudentMatchStatus.REVIEW_REQUIRED) {
            throw new IllegalArgumentException(
                    "APPLY_SUGGESTED só é permitido para SAFE_MATCH ou REVIEW_REQUIRED."
            );
        }

        if (item.localStudentId() == null) {
            throw new IntegrationConflictException(
                    "O preview não possui aluno local sugerido."
            );
        }

        return students.findById(item.localStudentId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Aluno local sugerido não encontrado: " + item.localStudentId()
                ));
    }

    private Student createNew(
            MicrosoftStudentMatchingPreviewService.PreviewItem item
    ) {
        if (item.status() != MicrosoftStudentMatchStatus.NEW_STUDENT) {
            throw new IllegalArgumentException(
                    "CREATE_NEW_STUDENT só é permitido para NEW_STUDENT."
            );
        }

        String registration = clean(item.externalId());
        if (registration != null && students.findByRegistrationIgnoreCase(registration).isPresent()) {
            throw new IntegrationConflictException(
                    "Já existe aluno local com a matrícula informada pelo Microsoft."
            );
        }

        return students.save(new Student(
                registration,
                item.displayName().trim(),
                null
        ));
    }

    private Student resolveExplicit(
            MicrosoftStudentMatchingPreviewService.PreviewItem item,
            UUID localStudentId
    ) {
        if (localStudentId == null) {
            throw new IllegalArgumentException(
                    "localStudentId é obrigatório para LINK_EXISTING_STUDENT."
            );
        }

        if (item.status() == MicrosoftStudentMatchStatus.CONFLICT) {
            throw new IntegrationConflictException(
                    "Conflitos precisam ser resolvidos antes de vincular outro aluno."
            );
        }

        return students.findById(localStudentId)
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Aluno local não encontrado: " + localStudentId
                ));
    }

    private ApplyResult alreadyLinkedResult(
            MicrosoftStudentMatchingPreviewService.PreviewItem item,
            UUID connectionId,
            UUID classroomLinkId
    ) {
        if (item.localEnrollmentId() == null || item.localStudentId() == null) {
            throw new IntegrationConflictException(
                    "O vínculo externo existente está inconsistente com a matrícula local."
            );
        }

        var link = externalLinks.linkStudent(
                connectionId,
                classroomLinkId,
                item.localEnrollmentId(),
                item.microsoftUserId()
        );

        return new ApplyResult(
                item.microsoftUserId(),
                item.localStudentId(),
                item.localEnrollmentId(),
                link.getId(),
                item.localStudentName(),
                MicrosoftStudentMatchApplyAction.APPLY_SUGGESTED,
                false
        );
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record ApplyResult(
            String microsoftUserId,
            UUID studentId,
            UUID enrollmentId,
            UUID externalStudentLinkId,
            String studentName,
            MicrosoftStudentMatchApplyAction action,
            boolean changed
    ) {}
}
