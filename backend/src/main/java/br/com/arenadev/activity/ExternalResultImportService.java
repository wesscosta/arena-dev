package br.com.arenadev.activity;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.classroom.EnrollmentRepository;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.scoring.ScoreCategory;
import br.com.arenadev.scoring.ScoreEventService;
import br.com.arenadev.scoring.ScoreSource;
import br.com.arenadev.shared.ResourceNotFoundException;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;

@Service
public class ExternalResultImportService {
    private final ActivityRepository activityRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ExternalResultImportRepository importRepository;
    private final ScoreEventService scoreEventService;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public ExternalResultImportService(
            ActivityRepository activityRepository,
            EnrollmentRepository enrollmentRepository,
            ExternalResultImportRepository importRepository,
            ScoreEventService scoreEventService
    ) {
        this.activityRepository = activityRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.importRepository = importRepository;
        this.scoreEventService = scoreEventService;
    }

    @Transactional(readOnly = true)
    public Preview preview(UUID activityId, ImportRequest request) {
        Activity activity = requireActivity(activityId);
        validateRequest(request);
        List<Enrollment> enrollments = enrollmentRepository.findByClassroomIdAndActiveTrueOrderByStudentNameAsc(activity.getClassroom().getId());
        Map<UUID, Student> allowedStudents = new HashMap<>();
        Map<String, Student> byRegistration = new HashMap<>();
        Map<String, List<Student>> byName = new HashMap<>();
        for (Enrollment enrollment : enrollments) {
            Student student = enrollment.getStudent();
            allowedStudents.put(student.getId(), student);
            if (student.getRegistration() != null && !student.getRegistration().isBlank()) {
                byRegistration.put(normalizeKey(student.getRegistration()), student);
            }
            indexName(byName, student.getName(), student);
            indexName(byName, student.getNickname(), student);
        }

        List<RowPreview> rows = new ArrayList<>();
        Set<UUID> usedStudents = new HashSet<>();
        int matched = 0;
        int unresolved = 0;
        int duplicates = 0;
        int scoreIssues = 0;
        for (int i = 0; i < request.rows().size(); i++) {
            RowInput input = request.rows().get(i);
            Student student = resolveStudent(input, allowedStudents, byRegistration, byName);
            String status;
            String note = null;
            if (student == null) {
                status = "UNMATCHED";
                note = "Aluno não identificado automaticamente.";
                unresolved++;
            } else if (!usedStudents.add(student.getId())) {
                status = "DUPLICATE";
                note = "O mesmo aluno aparece mais de uma vez neste relatório.";
                duplicates++;
            } else {
                status = "MATCHED";
                matched++;
            }
            BigDecimal percentage = resolvePercentage(input, request.fallbackMaxScore());
            if (student != null && !"DUPLICATE".equals(status) && percentage == null && activity.getPoints() > 0) {
                status = "SCORE_UNRESOLVED";
                note = "Informe a pontuação máxima do relatório ou use uma coluna de percentual.";
                scoreIssues++;
            }
            int xp = percentage == null ? 0 : calculateXp(activity.getPoints(), percentage);
            rows.add(new RowPreview(
                    input.rowIndex() == null ? i + 1 : input.rowIndex(),
                    input.participantName(), input.participantRegistration(), input.score(), input.maxScore(), percentage,
                    student == null ? null : student.getId(), student == null ? null : student.getName(), xp, status, note
            ));
        }
        String fingerprint = fingerprint(activityId, request);
        boolean duplicateImport = importRepository.existsByActivityIdAndFingerprint(activityId, fingerprint);
        return new Preview(
                activity.getId(), activity.getTitle(), activity.getPoints(), request.platform(), request.sourceName(),
                request.rows().size(), matched, unresolved, duplicates, scoreIssues, duplicateImport, fingerprint, rows
        );
    }

    @Transactional
    public ImportView execute(UUID activityId, ImportRequest request) {
        Activity activity = requireActivity(activityId);
        Preview preview = preview(activityId, request);
        if (preview.duplicateImport()) {
            throw new IllegalArgumentException("Este relatório já foi importado para a atividade.");
        }
        if (preview.unresolvedCount() > 0) {
            throw new IllegalArgumentException("Existem linhas sem aluno associado. Revise o mapeamento antes de importar.");
        }
        if (preview.duplicateStudentCount() > 0) {
            throw new IllegalArgumentException("O relatório possui o mesmo aluno em mais de uma linha. Resolva as duplicidades antes de importar.");
        }
        if (preview.scoreIssueCount() > 0) {
            throw new IllegalArgumentException("Existem linhas sem escala de pontuação válida. Informe a pontuação máxima antes de importar.");
        }

        List<ScoreEventService.CreateScoreEvent> scoreCommands = new ArrayList<>();
        int importedCount = 0;
        Map<Integer, RowInput> inputsByIndex = new HashMap<>();
        for (int i = 0; i < request.rows().size(); i++) {
            RowInput row = request.rows().get(i);
            inputsByIndex.put(row.rowIndex() == null ? i + 1 : row.rowIndex(), row);
        }
        for (RowPreview row : preview.rows()) {
            if (row.studentId() != null && row.xpAwarded() > 0) {
                scoreCommands.add(new ScoreEventService.CreateScoreEvent(
                        activity.getClassroom().getId(), row.studentId(), null, row.xpAwarded(),
                        ScoreCategory.SUBMISSION,
                        externalDescription(activity, request.platform(), row),
                        ScoreSource.ACTIVITY,
                        activity.getId().toString(), null
                ));
                importedCount++;
            }
        }
        var scoreEvents = scoreCommands.isEmpty() ? List.<ScoreEventService.ScoreEventView>of() : scoreEventService.createBatch(scoreCommands);

        ExternalResultImport resultImport = new ExternalResultImport(
                activity.getClassroom(), activity, clean(request.platform()), clean(request.sourceName()), preview.fingerprint(),
                request.fallbackMaxScore(), preview.rowCount(), preview.matchedCount(), importedCount
        );
        for (RowPreview row : preview.rows()) {
            RowInput input = inputsByIndex.get(row.rowIndex());
            Student student = row.studentId() == null ? null : enrollmentRepository
                    .findByClassroomIdAndStudentId(activity.getClassroom().getId(), row.studentId())
                    .map(Enrollment::getStudent)
                    .orElse(null);
            String status = row.xpAwarded() > 0 ? "IMPORTED" : "IMPORTED_NO_XP";
            resultImport.addRow(new ExternalResultRow(
                    row.rowIndex(), row.participantName(), row.participantRegistration(), row.score(), row.maxScore(), row.percentage(),
                    student, row.xpAwarded(), status, row.note(), writeJson(input == null ? Map.of() : input)
            ));
        }
        ExternalResultImport saved = importRepository.save(resultImport);
        return new ImportView(
                saved.getId(), activity.getId(), activity.getClassroom().getId(), saved.getPlatform(), saved.getSourceName(),
                saved.getRowCount(), saved.getMatchedCount(), saved.getImportedCount(), saved.getCreatedAt(), scoreEvents
        );
    }

    @Transactional(readOnly = true)
    public List<ImportSummary> history(UUID activityId) {
        requireActivity(activityId);
        return importRepository.findByActivityIdOrderByCreatedAtDesc(activityId).stream()
                .map(item -> new ImportSummary(
                        item.getId(), item.getPlatform(), item.getSourceName(), item.getRowCount(), item.getMatchedCount(),
                        item.getImportedCount(), item.getCreatedAt()
                ))
                .toList();
    }

    private Activity requireActivity(UUID id) {
        return activityRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
    }

    private void validateRequest(ImportRequest request) {
        if (request == null || request.rows() == null || request.rows().isEmpty()) {
            throw new IllegalArgumentException("O relatório não possui linhas para importar.");
        }
        if (request.rows().size() > 1000) throw new IllegalArgumentException("O relatório excede o limite de 1000 linhas.");
        if (request.fallbackMaxScore() != null && request.fallbackMaxScore().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A pontuação máxima deve ser maior que zero.");
        }
    }

    private Student resolveStudent(
            RowInput input,
            Map<UUID, Student> allowedStudents,
            Map<String, Student> byRegistration,
            Map<String, List<Student>> byName
    ) {
        if (input.studentId() != null) {
            Student selected = allowedStudents.get(input.studentId());
            if (selected == null) throw new IllegalArgumentException("O aluno selecionado não pertence à turma da atividade.");
            return selected;
        }
        String registration = normalizeKey(input.participantRegistration());
        if (!registration.isBlank() && byRegistration.containsKey(registration)) return byRegistration.get(registration);
        String name = normalizeKey(input.participantName());
        if (name.isBlank()) return null;
        List<Student> matches = byName.getOrDefault(name, List.of()).stream().distinct().toList();
        return matches.size() == 1 ? matches.get(0) : null;
    }

    private static void indexName(Map<String, List<Student>> index, String value, Student student) {
        String key = normalizeKey(value);
        if (key.isBlank()) return;
        index.computeIfAbsent(key, ignored -> new ArrayList<>()).add(student);
    }

    private static BigDecimal resolvePercentage(RowInput row, BigDecimal fallbackMaxScore) {
        if (row.percentage() != null) return clampPercent(row.percentage());
        if (row.score() == null) return null;
        BigDecimal max = row.maxScore() != null ? row.maxScore() : fallbackMaxScore;
        if (max == null || max.compareTo(BigDecimal.ZERO) <= 0) return null;
        return clampPercent(row.score().multiply(BigDecimal.valueOf(100)).divide(max, 4, RoundingMode.HALF_UP));
    }

    private static BigDecimal clampPercent(BigDecimal value) {
        if (value.compareTo(BigDecimal.ZERO) < 0) return BigDecimal.ZERO;
        if (value.compareTo(BigDecimal.valueOf(100)) > 0) return BigDecimal.valueOf(100);
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private static int calculateXp(int activityPoints, BigDecimal percentage) {
        if (activityPoints <= 0) return 0;
        return percentage.multiply(BigDecimal.valueOf(activityPoints))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    private static String externalDescription(Activity activity, String platform, RowPreview row) {
        String source = clean(platform);
        if (source == null) source = "recurso externo";
        return "Resultado externo: " + activity.getTitle() + " · " + source + " · " + row.percentage().stripTrailingZeros().toPlainString() + "%";
    }

    private String fingerprint(UUID activityId, ImportRequest request) {
        try {
            List<Map<String, Object>> contentRows = request.rows().stream().map(row -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("rowIndex", row.rowIndex());
                item.put("participantName", row.participantName());
                item.put("participantRegistration", row.participantRegistration());
                item.put("score", row.score());
                item.put("maxScore", row.maxScore());
                item.put("percentage", row.percentage());
                item.put("raw", row.raw());
                return item;
            }).toList();
            String canonical = activityId + "|" + clean(request.platform()) + "|" + request.fallbackMaxScore() + "|" + writeJson(contentRows);
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível gerar a assinatura do relatório.", ex);
        }
    }

    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception ex) { throw new IllegalArgumentException("Não foi possível processar o relatório externo.", ex); }
    }

    private static String normalizeKey(String value) {
        if (value == null) return "";
        String text = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String clean(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    public record RowInput(
            Integer rowIndex,
            String participantName,
            String participantRegistration,
            BigDecimal score,
            BigDecimal maxScore,
            BigDecimal percentage,
            UUID studentId,
            Map<String, Object> raw
    ) {}

    public record ImportRequest(
            String platform,
            String sourceName,
            BigDecimal fallbackMaxScore,
            List<RowInput> rows
    ) {}

    public record RowPreview(
            int rowIndex,
            String participantName,
            String participantRegistration,
            BigDecimal score,
            BigDecimal maxScore,
            BigDecimal percentage,
            UUID studentId,
            String studentName,
            int xpAwarded,
            String status,
            String note
    ) {}

    public record Preview(
            UUID activityId,
            String activityTitle,
            int activityPoints,
            String platform,
            String sourceName,
            int rowCount,
            int matchedCount,
            int unresolvedCount,
            int duplicateStudentCount,
            int scoreIssueCount,
            boolean duplicateImport,
            String fingerprint,
            List<RowPreview> rows
    ) {}

    public record ImportView(
            UUID importId,
            UUID activityId,
            UUID classroomId,
            String platform,
            String sourceName,
            int rowCount,
            int matchedCount,
            int importedCount,
            Instant createdAt,
            List<ScoreEventService.ScoreEventView> scoreEvents
    ) {}

    public record ImportSummary(
            UUID id,
            String platform,
            String sourceName,
            int rowCount,
            int matchedCount,
            int importedCount,
            Instant createdAt
    ) {}
}
