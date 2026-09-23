package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.integration.persistence.ExternalStudentLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class MicrosoftStudentMatchingPreviewService {
    private final MicrosoftRosterDiscoveryService rosterDiscovery;
    private final StudentRepository students;
    private final EnrollmentRepository enrollments;
    private final ExternalStudentLinkRepository externalStudentLinks;

    public MicrosoftStudentMatchingPreviewService(
            MicrosoftRosterDiscoveryService rosterDiscovery,
            StudentRepository students,
            EnrollmentRepository enrollments,
            ExternalStudentLinkRepository externalStudentLinks
    ) {
        this.rosterDiscovery = rosterDiscovery;
        this.students = students;
        this.enrollments = enrollments;
        this.externalStudentLinks = externalStudentLinks;
    }

    @Transactional(readOnly = true)
    public PreviewResult preview(UUID connectionId, UUID classroomLinkId) {
        var roster = rosterDiscovery.discover(connectionId, classroomLinkId);
        var allStudents = students.findAllByOrderByNameAsc();
        var classroomEnrollments = enrollments.findByClassroomIdOrderByStudentNameAsc(
                roster.classroomId()
        );

        var items = roster.members().stream()
                .map(member -> match(
                        connectionId,
                        classroomLinkId,
                        classroomEnrollments,
                        allStudents,
                        member
                ))
                .toList();

        return new PreviewResult(
                connectionId,
                classroomLinkId,
                roster.classroomId(),
                roster.microsoftClassId(),
                items,
                count(items, MicrosoftStudentMatchStatus.ALREADY_LINKED),
                count(items, MicrosoftStudentMatchStatus.SAFE_MATCH),
                count(items, MicrosoftStudentMatchStatus.NEW_STUDENT),
                count(items, MicrosoftStudentMatchStatus.REVIEW_REQUIRED),
                count(items, MicrosoftStudentMatchStatus.AMBIGUOUS),
                count(items, MicrosoftStudentMatchStatus.CONFLICT),
                count(items, MicrosoftStudentMatchStatus.IGNORED_NON_STUDENT)
        );
    }

    private PreviewItem match(
            UUID connectionId,
            UUID classroomLinkId,
            List<Enrollment> classroomEnrollments,
            List<Student> allStudents,
            MicrosoftEducationUser member
    ) {
        if (!member.isStudent()) {
            return PreviewItem.ignored(member);
        }

        var existingExternal = externalStudentLinks
                .findByConnectionIdAndExternalClassroomLinkIdAndExternalUserId(
                        connectionId,
                        classroomLinkId,
                        member.id()
                );

        if (existingExternal.isPresent()) {
            var externalLink = existingExternal.get();
            var enrollment = enrollments.findById(externalLink.getEnrollmentId()).orElse(null);
            var student = enrollment == null ? null : enrollment.getStudent();

            return new PreviewItem(
                    member.id(),
                    member.displayName(),
                    member.userPrincipalName(),
                    member.externalId(),
                    MicrosoftStudentMatchStatus.ALREADY_LINKED,
                    student == null ? null : student.getId(),
                    enrollment == null ? null : enrollment.getId(),
                    student == null ? null : student.getName(),
                    "Usuário Microsoft já vinculado a esta turma."
            );
        }

        Student registrationMatch = findByRegistration(allStudents, member.externalId());
        if (registrationMatch != null) {
            Enrollment enrollment = classroomEnrollments.stream()
                    .filter(it -> it.getStudent().getId().equals(registrationMatch.getId()))
                    .findFirst()
                    .orElse(null);

            if (enrollment != null) {
                var existingForEnrollment = externalStudentLinks
                        .findByConnectionIdAndEnrollmentId(connectionId, enrollment.getId());

                if (existingForEnrollment.isPresent()
                        && !existingForEnrollment.get().getExternalUserId().equals(member.id())) {
                    return new PreviewItem(
                            member.id(),
                            member.displayName(),
                            member.userPrincipalName(),
                            member.externalId(),
                            MicrosoftStudentMatchStatus.CONFLICT,
                            registrationMatch.getId(),
                            enrollment.getId(),
                            registrationMatch.getName(),
                            "A matrícula local já está vinculada a outro usuário Microsoft."
                    );
                }
            }

            return new PreviewItem(
                    member.id(),
                    member.displayName(),
                    member.userPrincipalName(),
                    member.externalId(),
                    MicrosoftStudentMatchStatus.SAFE_MATCH,
                    registrationMatch.getId(),
                    enrollment == null ? null : enrollment.getId(),
                    registrationMatch.getName(),
                    enrollment == null
                            ? "Matrícula institucional coincide; aluno existe, mas ainda não está matriculado nesta turma."
                            : "Matrícula institucional coincide com aluno já matriculado nesta turma."
            );
        }

        var sameName = allStudents.stream()
                .filter(student -> normalize(student.getName())
                        .equals(normalize(member.displayName())))
                .toList();

        if (sameName.size() == 1) {
            var candidate = sameName.getFirst();
            var enrollment = classroomEnrollments.stream()
                    .filter(it -> it.getStudent().getId().equals(candidate.getId()))
                    .findFirst()
                    .orElse(null);

            return new PreviewItem(
                    member.id(),
                    member.displayName(),
                    member.userPrincipalName(),
                    member.externalId(),
                    MicrosoftStudentMatchStatus.REVIEW_REQUIRED,
                    candidate.getId(),
                    enrollment == null ? null : enrollment.getId(),
                    candidate.getName(),
                    "Nome coincide, mas nome sozinho não é identificador seguro."
            );
        }

        if (sameName.size() > 1) {
            return new PreviewItem(
                    member.id(),
                    member.displayName(),
                    member.userPrincipalName(),
                    member.externalId(),
                    MicrosoftStudentMatchStatus.AMBIGUOUS,
                    null,
                    null,
                    null,
                    "Mais de um aluno local possui o mesmo nome normalizado."
            );
        }

        return new PreviewItem(
                member.id(),
                member.displayName(),
                member.userPrincipalName(),
                member.externalId(),
                MicrosoftStudentMatchStatus.NEW_STUDENT,
                null,
                null,
                null,
                "Nenhum aluno local foi identificado com segurança."
        );
    }

    private Student findByRegistration(List<Student> students, String externalId) {
        if (externalId == null || externalId.isBlank()) {
            return null;
        }

        return students.stream()
                .filter(student -> student.getRegistration() != null)
                .filter(student -> student.getRegistration().equalsIgnoreCase(externalId.trim()))
                .findFirst()
                .orElse(null);
    }

    private static long count(
            List<PreviewItem> items,
            MicrosoftStudentMatchStatus status
    ) {
        return items.stream().filter(item -> item.status() == status).count();
    }

    private static String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    public record PreviewItem(
            String microsoftUserId,
            String displayName,
            String userPrincipalName,
            String externalId,
            MicrosoftStudentMatchStatus status,
            UUID localStudentId,
            UUID localEnrollmentId,
            String localStudentName,
            String reason
    ) {
        static PreviewItem ignored(MicrosoftEducationUser member) {
            return new PreviewItem(
                    member.id(),
                    member.displayName(),
                    member.userPrincipalName(),
                    member.externalId(),
                    MicrosoftStudentMatchStatus.IGNORED_NON_STUDENT,
                    null,
                    null,
                    null,
                    "Membro não possui papel student no Microsoft Education."
            );
        }
    }

    public record PreviewResult(
            UUID connectionId,
            UUID classroomLinkId,
            UUID classroomId,
            String microsoftClassId,
            List<PreviewItem> items,
            long alreadyLinked,
            long safeMatches,
            long newStudents,
            long reviewRequired,
            long ambiguous,
            long conflicts,
            long ignored
    ) {
        public PreviewResult {
            items = List.copyOf(items);
        }
    }
}
