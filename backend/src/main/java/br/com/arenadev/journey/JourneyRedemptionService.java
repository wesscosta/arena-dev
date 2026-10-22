package br.com.arenadev.journey;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.classroom.StudentRepository;
import br.com.arenadev.identity.DeviceClaimService;
import br.com.arenadev.study.StudentJourneyAccess;
import br.com.arenadev.study.StudentJourneyAccessRepository;
import br.com.arenadev.study.StudyPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class JourneyRedemptionService {
    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final SecureRandom random = new SecureRandom();
    private final JourneyRepository journeys;
    private final JourneyRedemptionCodeRepository codes;
    private final StudentJourneyAccessRepository accesses;
    private final StudentRepository students;
    private final EnrollmentRepository enrollments;
    private final DeviceClaimService deviceClaims;

    public JourneyRedemptionService(
            JourneyRepository journeys,
            JourneyRedemptionCodeRepository codes,
            StudentJourneyAccessRepository accesses,
            StudentRepository students,
            EnrollmentRepository enrollments,
            DeviceClaimService deviceClaims
    ) {
        this.journeys = journeys;
        this.codes = codes;
        this.accesses = accesses;
        this.students = students;
        this.enrollments = enrollments;
        this.deviceClaims = deviceClaims;
    }

    @Transactional
    public CodeView enable(UUID journeyId) {
        Journey journey = requirePublished(journeyId);
        requireRedeemable(journey);
        JourneyRedemptionCode entity = codes.findByJourneyId(journeyId)
                .orElseGet(() -> new JourneyRedemptionCode(journey, nextCode()));
        if (!entity.isActive()) entity.regenerate(nextCode());
        return view(codes.save(entity));
    }

    @Transactional
    public CodeView regenerate(UUID journeyId) {
        Journey journey = requirePublished(journeyId);
        requireRedeemable(journey);
        JourneyRedemptionCode entity = codes.findByJourneyId(journeyId)
                .orElseGet(() -> new JourneyRedemptionCode(journey, nextCode()));
        entity.regenerate(nextCode());
        return view(codes.save(entity));
    }

    @Transactional
    public void disable(UUID journeyId) {
        codes.findByJourneyId(journeyId).ifPresent(JourneyRedemptionCode::disable);
    }

    @Transactional(readOnly = true)
    public CodeView status(UUID journeyId) {
        return codes.findByJourneyId(journeyId).map(this::view).orElse(new CodeView(null, false, 0));
    }

    @Transactional(readOnly = true)
    public RedemptionPreviewView preview(String rawCode) {
        Journey journey = requireActiveRedemption(rawCode).getJourney();
        requirePublished(journey.getId());
        requireRedeemable(journey);
        return new RedemptionPreviewView(
                journey.getId(),
                journey.getTitle(),
                journey.getClassroom().getId(),
                journey.getClassroom().getName()
        );
    }

    @Transactional
    public BootstrapRedemptionView redeemWithIdentity(String rawCode, String identity) {
        JourneyRedemptionCode redemption = requireActiveRedemption(rawCode);
        Journey journey = redemption.getJourney();
        requirePublished(journey.getId());
        requireRedeemable(journey);

        Enrollment enrollment = resolveEnrollment(journey, identity);
        DeviceClaimService.IssuedDeviceClaim claim = deviceClaims.issue(enrollment);
        RedemptionView redeemed = redeemForStudent(journey, enrollment.getStudent());

        return new BootstrapRedemptionView(
                journey.getClassroom().getId(),
                claim.token(),
                claim.expiresAt(),
                redeemed
        );
    }

    @Transactional
    public RedemptionView redeem(String rawCode, StudyPrincipal principal) {
        JourneyRedemptionCode redemption = requireActiveRedemption(rawCode);
        Journey journey = redemption.getJourney();
        requirePublished(journey.getId());
        requireRedeemable(journey);
        Student student = students.findById(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Perfil do aluno não encontrado."));
        return redeemForStudent(journey, student);
    }

    private RedemptionView redeemForStudent(Journey journey, Student student) {
        boolean existed = accesses.findByStudentIdAndJourneyId(student.getId(), journey.getId()).isPresent();
        accesses.findByStudentIdAndJourneyId(student.getId(), journey.getId())
                .orElseGet(() -> accesses.save(new StudentJourneyAccess(student, journey)));
        return new RedemptionView(journey.getId(), journey.getTitle(), journey.getDescription(), existed);
    }

    private Enrollment resolveEnrollment(Journey journey, String identity) {
        if (identity == null || identity.isBlank()) {
            throw new IllegalArgumentException("Informe sua matrícula, e-mail ou nome completo.");
        }

        List<Enrollment> candidates = enrollments
                .findByClassroomIdAndActiveTrueOrderByStudentNameAsc(journey.getClassroom().getId());

        List<Enrollment> registrationMatches = candidates.stream()
                .filter(item -> item.getStudent().getRegistration() != null)
                .filter(item -> item.getStudent().getRegistration().trim().equalsIgnoreCase(identity.trim()))
                .toList();
        if (registrationMatches.size() == 1) return registrationMatches.getFirst();
        if (registrationMatches.size() > 1) {
            throw new IllegalArgumentException("Identificação ambígua. Use sua matrícula para continuar.");
        }

        List<Enrollment> emailMatches = candidates.stream()
                .filter(item -> item.getStudent().getEmail() != null)
                .filter(item -> item.getStudent().getEmail().equalsIgnoreCase(identity.trim()))
                .toList();
        if (emailMatches.size() == 1) return emailMatches.getFirst();

        String wanted = normalizeIdentity(identity);
        List<Enrollment> matches = new ArrayList<>();
        for (Enrollment enrollment : candidates) {
            Student student = enrollment.getStudent();
            if (normalizeIdentity(student.getName()).equals(wanted)
                    || normalizeIdentity(student.getNickname()).equals(wanted)
                    || normalizeIdentity(enrollment.getPreferredName()).equals(wanted)) {
                matches.add(enrollment);
            }
        }

        if (matches.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Aluno não encontrado na turma desta Jornada. Confira a matrícula, o e-mail ou o nome completo."
            );
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("Identificação ambígua. Use sua matrícula para continuar.");
        }
        return matches.getFirst();
    }

    private JourneyRedemptionCode requireActiveRedemption(String rawCode) {
        String code = normalizeCode(rawCode);
        return codes.findByCodeIgnoreCaseAndActiveTrue(code)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Código de Jornada inválido ou desativado."
                ));
    }

    private Journey requirePublished(UUID id) {
        Journey journey = journeys.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Jornada não encontrada."));
        if (journey.getStatus() != JourneyStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A Jornada precisa estar publicada.");
        }
        return journey;
    }

    private void requireRedeemable(Journey journey) {
        if (journey.getStages().stream().anyMatch(stage -> stage.getCompletionRule() != JourneyCompletionRule.MANUAL)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Jornadas com conclusão dependente de atividades da turma ainda não podem ser distribuídas por código."
            );
        }
    }

    private String nextCode() {
        String value;
        do {
            StringBuilder builder = new StringBuilder("J-");
            for (int index = 0; index < 6; index++) {
                builder.append(ALPHABET[random.nextInt(ALPHABET.length)]);
            }
            value = builder.toString();
        } while (codes.existsByCodeIgnoreCase(value));
        return value;
    }

    private static String normalizeCode(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeIdentity(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }

    private CodeView view(JourneyRedemptionCode code) {
        return new CodeView(
                code.getCode(),
                code.isActive(),
                (int) accesses.countByJourneyId(code.getJourney().getId())
        );
    }

    public record CodeView(String code, boolean active, int redeemedCount) {}
    public record RedemptionView(UUID journeyId, String title, String description, boolean alreadyAdded) {}
    public record RedemptionPreviewView(UUID journeyId, String title, UUID classroomId, String classroomName) {}
    public record BootstrapRedemptionView(
            UUID classroomId,
            String deviceToken,
            java.time.Instant deviceExpiresAt,
            RedemptionView redemption
    ) {}
}
