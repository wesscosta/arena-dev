package br.com.arenadev.submission;

import br.com.arenadev.activity.ActivityQuestion;
import br.com.arenadev.activity.ActivityQuestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SubmissionItemService {

    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionItemRepository itemRepository;
    private final ActivityQuestionRepository questionRepository;
    private final SubmissionProcessEvidenceService processEvidenceService;
    private final JsonMapper json = JsonMapper.builder().build();

    public SubmissionItemService(
            ActivitySubmissionRepository submissionRepository,
            SubmissionItemRepository itemRepository,
            ActivityQuestionRepository questionRepository,
            SubmissionProcessEvidenceService processEvidenceService
    ) {
        this.submissionRepository = submissionRepository;
        this.itemRepository = itemRepository;
        this.questionRepository = questionRepository;
        this.processEvidenceService = processEvidenceService;
    }

    @Transactional
    public SubmissionItem saveItem(
            UUID activityId,
            UUID submissionId,
            UUID itemId,
            SaveItem command
    ) {
        ActivitySubmission submission = getSubmission(activityId, submissionId);
        ensureEditable(submission);

        if (command.kind() == null) {
            throw badRequest("Informe o tipo do item.");
        }
        if (command.position() < 0) {
            throw badRequest("A posição do item não pode ser negativa.");
        }

        ActivityQuestion question = resolveQuestion(
                submission,
                command.kind(),
                command.questionId()
        );

        String contentJson = serializeContent(command.content());

        SubmissionItem item = itemRepository
                .findByIdAndSubmissionId(itemId, submissionId)
                .orElse(null);

        if (item == null && question != null) {
            item = itemRepository
                    .findBySubmissionIdAndQuestionId(submissionId, question.getId())
                    .orElse(null);
        }

        if (item == null) {
            item = new SubmissionItem(
                    itemId,
                    submission,
                    command.kind(),
                    question,
                    command.position(),
                    contentJson
            );
        } else {
            item.update(
                    command.kind(),
                    question,
                    command.position(),
                    contentJson
            );
        }

        SubmissionItem saved = itemRepository.save(item);
        processEvidenceService.recordItemSaved(submission, saved);
        return saved;
    }

    @Transactional
    public void deleteItem(
            UUID activityId,
            UUID submissionId,
            UUID itemId
    ) {
        ActivitySubmission submission = getSubmission(activityId, submissionId);
        ensureEditable(submission);

        SubmissionItem item = itemRepository
                .findByIdAndSubmissionId(itemId, submissionId)
                .orElseThrow(() -> notFound("Item de entrega não encontrado."));

        itemRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public List<SubmissionItem> list(
            UUID activityId,
            UUID submissionId
    ) {
        getSubmission(activityId, submissionId);
        return itemRepository.findBySubmissionIdOrderByPositionAscCreatedAtAsc(submissionId);
    }

    @Transactional
    public ActivitySubmission submit(
            UUID activityId,
            UUID submissionId
    ) {
        ActivitySubmission submission = getSubmission(activityId, submissionId);

        try {
            submission.submit(Instant.now());
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    error.getMessage()
            );
        }

        ActivitySubmission saved = submissionRepository.save(submission);
        processEvidenceService.recordSubmitted(saved);
        return saved;
    }

    private ActivitySubmission getSubmission(
            UUID activityId,
            UUID submissionId
    ) {
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> notFound("Entrega não encontrada."));

        if (!submission.getActivity().getId().equals(activityId)) {
            throw notFound("Entrega não encontrada para esta atividade.");
        }

        return submission;
    }

    private ActivityQuestion resolveQuestion(
            ActivitySubmission submission,
            SubmissionItemKind kind,
            UUID questionId
    ) {
        if (kind == SubmissionItemKind.QUESTION_RESPONSE) {
            if (questionId == null) {
                throw badRequest("QUESTION_RESPONSE exige questionId.");
            }

            ActivityQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> notFound("Questão não encontrada."));

            if (!question.getActivity().getId()
                    .equals(submission.getActivity().getId())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A questão não pertence à atividade desta entrega."
                );
            }

            return question;
        }

        if (questionId != null) {
            throw badRequest(
                    "Somente QUESTION_RESPONSE pode referenciar questionId."
            );
        }

        return null;
    }

    private String serializeContent(Object content) {
        if (content == null) {
            throw badRequest("Informe o conteúdo do item.");
        }

        try {
            String serialized = json.writeValueAsString(content);

            if (serialized.length() > 1_000_000) {
                throw badRequest(
                        "Conteúdo do item excede o limite de 1 MB."
                );
            }

            return serialized;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RuntimeException error) {
            throw badRequest(
                    "Conteúdo do item não pôde ser serializado."
            );
        }
    }

    private void ensureEditable(ActivitySubmission submission) {
        if (!submission.isEditable()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A entrega já foi enviada e não pode mais ser alterada."
            );
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                message
        );
    }

    public record SaveItem(
            SubmissionItemKind kind,
            UUID questionId,
            int position,
            Object content
    ) {}
}
