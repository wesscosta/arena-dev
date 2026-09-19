package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.integration.application.IntegrationConflictException;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MicrosoftRosterReconciliationService {
    private final MicrosoftRosterDiscoveryService rosterDiscovery;
    private final ExternalStudentLinkRepository externalStudentLinks;
    private final EnrollmentRepository enrollments;

    public MicrosoftRosterReconciliationService(
            MicrosoftRosterDiscoveryService rosterDiscovery,
            ExternalStudentLinkRepository externalStudentLinks,
            EnrollmentRepository enrollments
    ) {
        this.rosterDiscovery = rosterDiscovery;
        this.externalStudentLinks = externalStudentLinks;
        this.enrollments = enrollments;
    }

    @Transactional(readOnly = true)
    public ReconciliationResult analyze(UUID connectionId, UUID classroomLinkId) {
        var roster = rosterDiscovery.discover(connectionId, classroomLinkId);

        Set<String> currentStudentIds = roster.members().stream()
                .filter(MicrosoftEducationUser::isStudent)
                .map(MicrosoftEducationUser::id)
                .collect(Collectors.toSet());

        var items = externalStudentLinks
                .findByConnectionIdAndExternalClassroomLinkId(connectionId, classroomLinkId)
                .stream()
                .map(link -> {
                    var enrollment = enrollments.findById(link.getEnrollmentId()).orElse(null);

                    if (enrollment == null) {
                        return new ReconciliationItem(
                                link.getId(),
                                link.getExternalUserId(),
                                link.getEnrollmentId(),
                                null,
                                null,
                                MicrosoftRosterReconciliationStatus.BROKEN_LINK,
                                "O vínculo externo aponta para uma matrícula local inexistente."
                        );
                    }

                    var student = enrollment.getStudent();
                    boolean existsRemotely = currentStudentIds.contains(link.getExternalUserId());

                    if (!existsRemotely) {
                        return new ReconciliationItem(
                                link.getId(),
                                link.getExternalUserId(),
                                enrollment.getId(),
                                student.getId(),
                                student.getName(),
                                MicrosoftRosterReconciliationStatus.REMOTE_MISSING,
                                "Aluno vinculado localmente não aparece mais no roster atual do Teams."
                        );
                    }

                    if (!enrollment.isActive()) {
                        return new ReconciliationItem(
                                link.getId(),
                                link.getExternalUserId(),
                                enrollment.getId(),
                                student.getId(),
                                student.getName(),
                                MicrosoftRosterReconciliationStatus.LOCAL_INACTIVE,
                                "Aluno ainda aparece no Teams, mas a matrícula local está inativa."
                        );
                    }

                    return new ReconciliationItem(
                            link.getId(),
                            link.getExternalUserId(),
                            enrollment.getId(),
                            student.getId(),
                            student.getName(),
                            MicrosoftRosterReconciliationStatus.IN_SYNC,
                            "Vínculo e matrícula estão coerentes com o roster atual."
                    );
                })
                .toList();

        return new ReconciliationResult(
                connectionId,
                classroomLinkId,
                roster.classroomId(),
                roster.microsoftClassId(),
                items,
                count(items, MicrosoftRosterReconciliationStatus.IN_SYNC),
                count(items, MicrosoftRosterReconciliationStatus.REMOTE_MISSING),
                count(items, MicrosoftRosterReconciliationStatus.LOCAL_INACTIVE),
                count(items, MicrosoftRosterReconciliationStatus.BROKEN_LINK)
        );
    }

    @Transactional
    public ReconciliationApplyResult apply(
            UUID connectionId,
            UUID classroomLinkId,
            UUID externalStudentLinkId,
            MicrosoftRosterReconciliationAction action
    ) {
        if (action == null) {
            throw new IllegalArgumentException("action é obrigatória.");
        }

        var analysis = analyze(connectionId, classroomLinkId);
        var item = analysis.items().stream()
                .filter(candidate -> candidate.externalStudentLinkId().equals(externalStudentLinkId))
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo externo de estudante não encontrado na reconciliação atual."
                ));

        if (item.status() == MicrosoftRosterReconciliationStatus.BROKEN_LINK) {
            throw new IntegrationConflictException(
                    "Vínculo inconsistente precisa de correção administrativa antes da reconciliação."
            );
        }

        var enrollment = enrollments.findById(item.enrollmentId())
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Matrícula local não encontrada: " + item.enrollmentId()
                ));

        switch (action) {
            case DEACTIVATE_ENROLLMENT -> {
                if (item.status() != MicrosoftRosterReconciliationStatus.REMOTE_MISSING) {
                    throw new IllegalArgumentException(
                            "DEACTIVATE_ENROLLMENT só é permitido para REMOTE_MISSING."
                    );
                }
                enrollment.setActive(false);
            }
            case REACTIVATE_ENROLLMENT -> {
                if (item.status() != MicrosoftRosterReconciliationStatus.LOCAL_INACTIVE) {
                    throw new IllegalArgumentException(
                            "REACTIVATE_ENROLLMENT só é permitido para LOCAL_INACTIVE."
                    );
                }
                enrollment.setActive(true);
            }
        }

        return new ReconciliationApplyResult(
                externalStudentLinkId,
                enrollment.getId(),
                enrollment.getStudent().getId(),
                enrollment.getStudent().getName(),
                action,
                enrollment.isActive()
        );
    }

    private static long count(
            List<ReconciliationItem> items,
            MicrosoftRosterReconciliationStatus status
    ) {
        return items.stream().filter(item -> item.status() == status).count();
    }

    public record ReconciliationItem(
            UUID externalStudentLinkId,
            String microsoftUserId,
            UUID enrollmentId,
            UUID studentId,
            String studentName,
            MicrosoftRosterReconciliationStatus status,
            String reason
    ) {}

    public record ReconciliationResult(
            UUID connectionId,
            UUID classroomLinkId,
            UUID classroomId,
            String microsoftClassId,
            List<ReconciliationItem> items,
            long inSync,
            long remoteMissing,
            long localInactive,
            long brokenLinks
    ) {
        public ReconciliationResult {
            items = List.copyOf(items);
        }
    }

    public record ReconciliationApplyResult(
            UUID externalStudentLinkId,
            UUID enrollmentId,
            UUID studentId,
            String studentName,
            MicrosoftRosterReconciliationAction action,
            boolean enrollmentActive
    ) {}
}
