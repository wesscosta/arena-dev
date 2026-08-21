package br.com.arenadev.activity;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.*;

@Service
public class ActivityService {
    private final ActivityRepository activityRepository;
    private final ClassroomRepository classroomRepository;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public ActivityService(ActivityRepository activityRepository, ClassroomRepository classroomRepository) {
        this.activityRepository = activityRepository;
        this.classroomRepository = classroomRepository;
    }

    @Transactional(readOnly = true)
    public List<ActivityView> list(UUID classroomId) {
        requireClassroom(classroomId);
        return activityRepository.findByClassroomIdOrderByUpdatedAtDesc(classroomId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityView get(UUID id) {
        return toView(requireActivity(id));
    }

    @Transactional
    public ActivityView create(ActivityInput input) {
        validateInput(input);
        Classroom classroom = requireClassroom(input.classroomId());
        Activity activity = new Activity(classroom, input.title().trim());
        apply(activity, input);
        applyQuestions(activity, input.questions());
        return toView(activityRepository.save(activity));
    }

    @Transactional
    public ActivityView update(UUID id, ActivityInput input) {
        validateInput(input);
        Activity activity = requireActivity(id);
        if (!activity.getClassroom().getId().equals(input.classroomId())) {
            throw new IllegalArgumentException("A atividade não pode ser movida para outra turma. Use a cópia entre turmas.");
        }
        apply(activity, input);
        applyQuestions(activity, input.questions());
        return toView(activity);
    }

    @Transactional
    public ActivityView copy(UUID id, UUID destinationClassroomId) {
        Activity source = requireActivity(id);
        Classroom destination = requireClassroom(destinationClassroomId);
        Activity copy = new Activity(destination, source.getTitle());
        copy.update(
                source.getTitle(), source.getTopic(), source.getPoints(), source.getOnTimeBonus(),
                source.getResourceKind(), source.getResourcePlatform(), source.getResourceUrl()
        );
        copy.markCopiedFrom(source);
        int position = 0;
        for (ActivityQuestion sourceQuestion : source.getQuestions()) {
            ActivityQuestion question = cloneQuestion(sourceQuestion, position++);
            copy.addQuestion(question);
        }
        return toView(activityRepository.save(copy));
    }

    private void apply(Activity activity, ActivityInput input) {
        ActivityResourceKind kind = input.resource() == null || input.resource().kind() == null
                ? ActivityResourceKind.INTERNAL
                : input.resource().kind();
        String platform = kind == ActivityResourceKind.EXTERNAL && input.resource() != null
                ? clean(input.resource().platform()) : null;
        String url = kind == ActivityResourceKind.EXTERNAL && input.resource() != null
                ? clean(input.resource().url()) : null;
        if (url != null) validateUrl(url);
        activity.update(
                input.title().trim(), clean(input.topic()), input.points(), input.onTimeBonus(),
                kind, platform, url
        );
    }

    private void applyQuestions(Activity activity, List<QuestionInput> inputs) {
        List<QuestionInput> safeInputs = inputs == null ? List.of() : inputs;
        Map<UUID, ActivityQuestion> existing = new HashMap<>();
        for (ActivityQuestion question : activity.getQuestions()) existing.put(question.getId(), question);
        Set<UUID> usedExisting = new HashSet<>();

        for (int position = 0; position < safeInputs.size(); position++) {
            QuestionInput input = safeInputs.get(position);
            validateQuestion(input, position + 1);
            UUID requestedId = parseUuid(input.id());
            ActivityQuestion question = requestedId == null ? null : existing.get(requestedId);
            if (question == null) {
                question = new ActivityQuestion(input.type(), input.statement().trim(), input.difficulty(), input.points(), position);
                activity.addQuestion(question);
            } else {
                usedExisting.add(question.getId());
            }
            question.update(
                    input.type(), input.statement().trim(), input.difficulty(), input.points(), position,
                    writeJson(input.options()), writeJson(input.answer()), clean(input.expectedAnswer()),
                    clean(input.explanation()), input.code(), clean(input.language()), clean(input.expectedOutcome()),
                    writeJson(input.evaluationCriteria())
            );
        }

        List<ActivityQuestion> stale = activity.getQuestions().stream()
                .filter(question -> question.getId() != null && existing.containsKey(question.getId()) && !usedExisting.contains(question.getId()))
                .toList();
        stale.forEach(activity::removeQuestion);
    }

    private ActivityQuestion cloneQuestion(ActivityQuestion source, int position) {
        ActivityQuestion copy = new ActivityQuestion(source.getType(), source.getStatement(), source.getDifficulty(), source.getPoints(), position);
        copy.update(
                source.getType(), source.getStatement(), source.getDifficulty(), source.getPoints(), position,
                source.getOptionsJson(), source.getAnswerJson(), source.getExpectedAnswer(), source.getExplanation(),
                source.getCode(), source.getLanguage(), source.getExpectedOutcome(), source.getEvaluationCriteriaJson()
        );
        return copy;
    }

    private void validateInput(ActivityInput input) {
        if (input == null || input.classroomId() == null) throw new IllegalArgumentException("Turma é obrigatória.");
        if (input.title() == null || input.title().isBlank()) throw new IllegalArgumentException("Título da atividade é obrigatório.");
        if (input.points() < 0 || input.onTimeBonus() < 0) throw new IllegalArgumentException("XP e bônus não podem ser negativos.");
    }

    private void validateQuestion(QuestionInput input, int position) {
        if (input == null || input.type() == null || input.difficulty() == null || input.statement() == null || input.statement().isBlank()) {
            throw new IllegalArgumentException("Questão " + position + " possui campos obrigatórios ausentes.");
        }
        if (input.points() < 0) throw new IllegalArgumentException("Questão " + position + ": points não pode ser negativo.");
        if (input.type() == QuestionType.MULTIPLE_CHOICE) {
            if (input.options() == null || input.options().size() != 4) {
                throw new IllegalArgumentException("Questão " + position + ": múltipla escolha deve ter exatamente 4 alternativas.");
            }
            Set<String> ids = new HashSet<>();
            for (QuestionOptionInput option : input.options()) {
                if (option == null || option.id() == null || option.id().isBlank() || option.text() == null || option.text().isBlank() || !ids.add(option.id())) {
                    throw new IllegalArgumentException("Questão " + position + ": alternativas inválidas ou duplicadas.");
                }
            }
            String answer = input.answer() instanceof String value ? value : null;
            if (answer == null || !ids.contains(answer)) throw new IllegalArgumentException("Questão " + position + ": resposta deve apontar para uma alternativa válida.");
        }
        if (input.type() == QuestionType.TRUE_FALSE && !(input.answer() instanceof Boolean)) {
            throw new IllegalArgumentException("Questão " + position + ": verdadeiro/falso deve possuir resposta booleana.");
        }
    }

    private Classroom requireClassroom(UUID id) {
        return classroomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada."));
    }

    private Activity requireActivity(UUID id) {
        return activityRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
    }

    private void validateUrl(String value) {
        try {
            URI uri = URI.create(value);
            if (uri.getScheme() == null || !(uri.getScheme().equalsIgnoreCase("http") || uri.getScheme().equalsIgnoreCase("https"))) throw new IllegalArgumentException();
        } catch (Exception ex) {
            throw new IllegalArgumentException("URL externa inválida.");
        }
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try { return objectMapper.writeValueAsString(value); }
        catch (RuntimeException ex) { throw new IllegalArgumentException("Conteúdo da questão não pôde ser serializado."); }
    }

    private <T> T readJson(String value, TypeReference<T> type, T fallback) {
        if (value == null || value.isBlank()) return fallback;
        try { return objectMapper.readValue(value, type); }
        catch (RuntimeException ex) { return fallback; }
    }

    private Object readAnswer(String value) {
        if (value == null || value.isBlank()) return null;
        try { return objectMapper.readValue(value, Object.class); }
        catch (RuntimeException ex) { return null; }
    }

    private ActivityView toView(Activity activity) {
        List<QuestionView> questions = activity.getQuestions().stream().map(question -> new QuestionView(
                question.getId().toString(), question.getType(), question.getStatement(), question.getDifficulty(), question.getPoints(),
                readJson(question.getOptionsJson(), new TypeReference<List<QuestionOptionView>>() {}, null),
                readAnswer(question.getAnswerJson()), question.getExpectedAnswer(), question.getExplanation(), question.getCode(),
                question.getLanguage(), question.getExpectedOutcome(),
                readJson(question.getEvaluationCriteriaJson(), new TypeReference<List<String>>() {}, null)
        )).toList();
        return new ActivityView(
                activity.getId(), activity.getClassroom().getId(), activity.getTitle(), activity.getTopic(), activity.getPoints(),
                activity.getOnTimeBonus(), new ResourceView(activity.getResourceKind(), activity.getResourcePlatform(), activity.getResourceUrl()),
                questions, activity.getCreatedAt(), activity.getUpdatedAt(), activity.getCopiedFromActivityId(), activity.getCopiedFromClassroomId()
        );
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try { return UUID.fromString(value); } catch (IllegalArgumentException ex) { return null; }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record ActivityInput(
            UUID classroomId, String title, String topic, int points, int onTimeBonus,
            ResourceInput resource, List<QuestionInput> questions
    ) {}
    public record ResourceInput(ActivityResourceKind kind, String platform, String url) {}
    public record QuestionInput(
            String id, QuestionType type, String statement, QuestionDifficulty difficulty, int points,
            List<QuestionOptionInput> options, Object answer, String expectedAnswer, String explanation,
            String code, String language, String expectedOutcome, List<String> evaluationCriteria
    ) {}
    public record QuestionOptionInput(String id, String text) {}
    public record CopyInput(UUID destinationClassroomId) {}

    public record ActivityView(
            UUID id, UUID classroomId, String title, String topic, int points, int onTimeBonus,
            ResourceView resource, List<QuestionView> questions, Instant createdAt, Instant updatedAt,
            UUID copiedFromActivityId, UUID copiedFromClassroomId
    ) {}
    public record ResourceView(ActivityResourceKind kind, String platform, String url) {}
    public record QuestionView(
            String id, QuestionType type, String statement, QuestionDifficulty difficulty, int points,
            List<QuestionOptionView> options, Object answer, String expectedAnswer, String explanation,
            String code, String language, String expectedOutcome, List<String> evaluationCriteria
    ) {}
    public record QuestionOptionView(String id, String text) {}
}
