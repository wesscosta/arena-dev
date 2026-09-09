package br.com.arenadev.activity;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.*;

@Service
public class ActivityStepService {
    private static final int MAX_STEPS = 100;
    private static final int MAX_INSTRUCTIONS = 2_000;
    private static final int MAX_SLIDE_CONTENT = 12_000;

    private final ActivityRepository activityRepository;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    public ActivityStepService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @Transactional(readOnly = true)
    public List<StepView> list(UUID activityId) {
        Activity activity = requireActivity(activityId);
        return activity.getSteps().stream().map(this::toView).toList();
    }

    @Transactional
    public List<StepView> replace(UUID activityId, List<StepInput> inputs) {
        Activity activity = requireActivity(activityId);
        List<StepInput> safeInputs = inputs == null ? List.of() : inputs;

        if (safeInputs.size() > MAX_STEPS) {
            throw new IllegalArgumentException("Um roteiro pode possuir no máximo " + MAX_STEPS + " blocos.");
        }

        Map<UUID, ActivityStep> existing = new HashMap<>();
        for (ActivityStep step : activity.getSteps()) {
            if (step.getId() != null) existing.put(step.getId(), step);
        }

        Set<UUID> usedExisting = new HashSet<>();

        for (int position = 0; position < safeInputs.size(); position++) {
            StepInput input = safeInputs.get(position);
            validateInput(activity, input, position + 1);

            ActivityStep step;
            if (input.id() == null) {
                step = new ActivityStep(input.type(), position);
                activity.addStep(step);
            } else {
                step = existing.get(input.id());
                if (step == null) {
                    throw new IllegalArgumentException("Bloco " + (position + 1) + " não pertence a esta atividade.");
                }
                if (!usedExisting.add(step.getId())) {
                    throw new IllegalArgumentException("O mesmo bloco não pode aparecer duas vezes no roteiro.");
                }
            }

            ActivityQuestion question = input.type() == ActivityStepType.QUESTION
                    ? requireQuestion(activity, input.questionId(), position + 1)
                    : null;

            WordCloudConfigInput wordCloud = input.type() == ActivityStepType.WORD_CLOUD
                    ? input.wordCloud()
                    : null;

            PollConfigInput poll = input.type() == ActivityStepType.POLL
                    ? input.poll()
                    : null;

            step.update(
                    input.type(),
                    position,
                    clean(input.title()),
                    clean(input.instructions()),
                    question,
                    input.type() == ActivityStepType.SLIDE ? clean(input.slideContent()) : null,
                    wordCloud == null ? null : wordCloud.prompt().trim(),
                    wordCloud == null ? null : wordCloud.maxWordsPerParticipant(),
                    wordCloud == null ? null : wordCloud.liveReveal(),
                    poll == null ? null : poll.prompt().trim(),
                    poll == null ? null : writeJson(poll.options()),
                    poll == null ? null : poll.liveResults()
            );
        }

        List<ActivityStep> stale = activity.getSteps().stream()
                .filter(step -> step.getId() != null
                        && existing.containsKey(step.getId())
                        && !usedExisting.contains(step.getId()))
                .toList();
        stale.forEach(activity::removeStep);

        activityRepository.flush();

        return activity.getSteps().stream()
                .sorted(Comparator.comparingInt(ActivityStep::getPosition))
                .map(this::toView)
                .toList();
    }

    private void validateInput(Activity activity, StepInput input, int humanPosition) {
        if (input == null || input.type() == null) {
            throw new IllegalArgumentException("Bloco " + humanPosition + " precisa informar o tipo.");
        }

        validateLength(input.title(), 180, "Título", humanPosition);
        validateLength(input.instructions(), MAX_INSTRUCTIONS, "Instruções", humanPosition);

        switch (input.type()) {
            case SLIDE -> {
                if (input.slideContent() == null || input.slideContent().isBlank()) {
                    throw new IllegalArgumentException("Bloco " + humanPosition + ": slide precisa possuir conteúdo.");
                }
                validateLength(input.slideContent(), MAX_SLIDE_CONTENT, "Conteúdo do slide", humanPosition);
            }
            case QUESTION -> requireQuestion(activity, input.questionId(), humanPosition);
            case WORD_CLOUD -> validateWordCloud(input.wordCloud(), humanPosition);
            case POLL -> validatePoll(input.poll(), humanPosition);
        }
    }

    private void validateWordCloud(WordCloudConfigInput config, int position) {
        if (config == null || config.prompt() == null || config.prompt().isBlank()) {
            throw new IllegalArgumentException("Bloco " + position + ": Nuvem de Palavras precisa possuir pergunta.");
        }
        if (config.prompt().trim().length() > 280) {
            throw new IllegalArgumentException("Bloco " + position + ": pergunta da Nuvem excede 280 caracteres.");
        }
        if (config.maxWordsPerParticipant() < 1 || config.maxWordsPerParticipant() > 5) {
            throw new IllegalArgumentException("Bloco " + position + ": máximo de palavras deve ficar entre 1 e 5.");
        }
    }

    private void validatePoll(PollConfigInput config, int position) {
        if (config == null || config.prompt() == null || config.prompt().isBlank()) {
            throw new IllegalArgumentException("Bloco " + position + ": Votação precisa possuir pergunta.");
        }
        if (config.prompt().trim().length() > 280) {
            throw new IllegalArgumentException("Bloco " + position + ": pergunta da Votação excede 280 caracteres.");
        }

        List<PollOptionInput> options = config.options() == null ? List.of() : config.options();
        if (options.size() < 2 || options.size() > 6) {
            throw new IllegalArgumentException("Bloco " + position + ": Votação deve possuir entre 2 e 6 opções.");
        }

        Set<String> ids = new HashSet<>();
        for (PollOptionInput option : options) {
            if (option == null
                    || option.id() == null
                    || option.id().isBlank()
                    || option.text() == null
                    || option.text().isBlank()) {
                throw new IllegalArgumentException("Bloco " + position + ": opção de votação inválida.");
            }

            String id = option.id().trim();
            if (!ids.add(id)) {
                throw new IllegalArgumentException("Bloco " + position + ": IDs das opções de votação devem ser únicos.");
            }
            if (option.text().trim().length() > 160) {
                throw new IllegalArgumentException("Bloco " + position + ": opção de votação excede 160 caracteres.");
            }
        }
    }

    private ActivityQuestion requireQuestion(Activity activity, UUID questionId, int position) {
        if (questionId == null) {
            throw new IllegalArgumentException("Bloco " + position + ": questão é obrigatória.");
        }
        return activity.getQuestions().stream()
                .filter(question -> questionId.equals(question.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Bloco " + position + ": questão não pertence a esta atividade."
                ));
    }

    private Activity requireActivity(UUID id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada."));
    }

    private StepView toView(ActivityStep step) {
        WordCloudConfigView wordCloud = step.getType() == ActivityStepType.WORD_CLOUD
                ? new WordCloudConfigView(
                        step.getWordCloudPrompt(),
                        step.getWordCloudMaxWords(),
                        Boolean.TRUE.equals(step.getWordCloudLiveReveal())
                )
                : null;

        PollConfigView poll = step.getType() == ActivityStepType.POLL
                ? new PollConfigView(
                        step.getPollPrompt(),
                        readJson(
                                step.getPollOptionsJson(),
                                new TypeReference<List<PollOptionView>>() {},
                                List.of()
                        ),
                        Boolean.TRUE.equals(step.getPollLiveResults())
                )
                : null;

        return new StepView(
                step.getId(),
                step.getPosition(),
                step.getType(),
                step.getTitle(),
                step.getInstructions(),
                step.getQuestion() == null ? null : step.getQuestion().getId(),
                step.getSlideContent(),
                wordCloud,
                poll
        );
    }

    private void validateLength(String value, int max, String field, int position) {
        if (value != null && value.trim().length() > max) {
            throw new IllegalArgumentException(
                    "Bloco " + position + ": " + field + " excede " + max + " caracteres."
            );
        }
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("Configuração do bloco não pôde ser serializada.");
        }
    }

    private <T> T readJson(String value, TypeReference<T> type, T fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return objectMapper.readValue(value, type);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StepInput(
            UUID id,
            ActivityStepType type,
            String title,
            String instructions,
            UUID questionId,
            String slideContent,
            WordCloudConfigInput wordCloud,
            PollConfigInput poll
    ) {}

    public record WordCloudConfigInput(
            String prompt,
            int maxWordsPerParticipant,
            boolean liveReveal
    ) {}

    public record PollConfigInput(
            String prompt,
            List<PollOptionInput> options,
            boolean liveResults
    ) {}

    public record PollOptionInput(String id, String text) {}

    public record StepView(
            UUID id,
            int position,
            ActivityStepType type,
            String title,
            String instructions,
            UUID questionId,
            String slideContent,
            WordCloudConfigView wordCloud,
            PollConfigView poll
    ) {}

    public record WordCloudConfigView(
            String prompt,
            Integer maxWordsPerParticipant,
            boolean liveReveal
    ) {}

    public record PollConfigView(
            String prompt,
            List<PollOptionView> options,
            boolean liveResults
    ) {}

    public record PollOptionView(String id, String text) {}
}
