
package br.com.arenadev.submission;

import br.com.arenadev.activity.Activity;
import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class LearningPlatformIntegrationService {
    private final ActivityRepository activityRepository;
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionAssessmentRepository assessmentRepository;
    private final ActivityProviderLinkRepository activityLinkRepository;
    private final SubmissionProviderLinkRepository submissionLinkRepository;
    private final Map<LearningPlatformProvider, LearningPlatformGateway> gateways;

    public LearningPlatformIntegrationService(ActivityRepository activityRepository, ActivitySubmissionRepository submissionRepository,
            SubmissionAssessmentRepository assessmentRepository, ActivityProviderLinkRepository activityLinkRepository,
            SubmissionProviderLinkRepository submissionLinkRepository, List<LearningPlatformGateway> gateways) {
        this.activityRepository = activityRepository; this.submissionRepository = submissionRepository;
        this.assessmentRepository = assessmentRepository; this.activityLinkRepository = activityLinkRepository;
        this.submissionLinkRepository = submissionLinkRepository;
        this.gateways = gateways.stream().collect(Collectors.toUnmodifiableMap(LearningPlatformGateway::provider, Function.identity(), (a,b)->a));
    }

    @Transactional(readOnly = true)
    public IntegrationOverview overview(UUID activityId) {
        Activity activity = requireActivity(activityId);
        Map<LearningPlatformProvider, ActivityProviderLink> links = activityLinkRepository.findByActivityIdOrderByProviderAsc(activityId)
                .stream().collect(Collectors.toMap(ActivityProviderLink::getProvider, Function.identity()));
        List<ProviderView> providers = Arrays.stream(LearningPlatformProvider.values()).map(provider -> {
            ActivityProviderLink link = links.get(provider); LearningPlatformGateway gateway = gateways.get(provider);
            return new ProviderView(provider, gateway != null && gateway.configured(), link != null,
                    link == null ? null : link.getExternalClassId(),
                    link == null ? null : link.getExternalAssignmentId(),
                    link == null ? null : link.getExternalWebUrl());
        }).toList();
        return new IntegrationOverview(activity.getId(), activity.getTitle(), providers);
    }

    @Transactional
    public IntegrationOverview linkActivity(UUID activityId, LearningPlatformProvider provider, LinkActivityCommand command) {
        Activity activity = requireActivity(activityId);
        ActivityProviderLink link = activityLinkRepository.findByActivityIdAndProvider(activityId, provider).orElse(null);
        if (link == null) link = new ActivityProviderLink(activity, provider, command.externalClassId(), command.externalAssignmentId(), command.externalWebUrl());
        else link.update(command.externalClassId(), command.externalAssignmentId(), command.externalWebUrl());
        activityLinkRepository.save(link);
        return overview(activityId);
    }

    @Transactional(readOnly = true)
    public FeedbackExportPreview feedbackExportPreview(UUID activityId, UUID submissionId, LearningPlatformProvider provider) {
        ActivitySubmission submission = requireSubmission(activityId, submissionId);
        SubmissionAssessment assessment = assessmentRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada."));
        if (assessment.getPublishedFeedback() == null || assessment.getPublishedFeedback().isBlank())
            throw new IllegalStateException("Somente feedback publicado pode ser preparado para sincronização externa.");
        ActivityProviderLink activityLink = activityLinkRepository.findByActivityIdAndProvider(activityId, provider)
                .orElseThrow(() -> new ResourceNotFoundException("A atividade ainda não está vinculada ao provider."));
        SubmissionProviderLink submissionLink = submissionLinkRepository.findBySubmissionIdAndProvider(submissionId, provider).orElse(null);
        return new FeedbackExportPreview(provider, activityLink.getExternalAssignmentId(),
                submissionLink == null ? null : submissionLink.getExternalSubmissionId(), assessment.getPublishedFeedback(),
                assessment.getFeedbackPublishedAt(), submissionLink != null);
    }

    private Activity requireActivity(UUID id) { return activityRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Atividade não encontrada.")); }
    private ActivitySubmission requireSubmission(UUID activityId, UUID submissionId) {
        ActivitySubmission s = submissionRepository.findById(submissionId).orElseThrow(() -> new ResourceNotFoundException("Entrega não encontrada."));
        if (!s.getActivity().getId().equals(activityId)) throw new ResourceNotFoundException("Entrega não encontrada para esta atividade.");
        return s;
    }

    public record LinkActivityCommand(String externalClassId, String externalAssignmentId, String externalWebUrl) {}
    public record IntegrationOverview(UUID activityId, String activityTitle, List<ProviderView> providers) {}
    public record ProviderView(LearningPlatformProvider provider, boolean adapterConfigured, boolean linked, String externalClassId, String externalAssignmentId, String externalWebUrl) {}
    public record FeedbackExportPreview(LearningPlatformProvider provider, String externalAssignmentId, String externalSubmissionId, String publishedFeedback, Instant publishedAt, boolean readyForProviderCall) {}
}
