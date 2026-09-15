package br.com.arenadev.submission;

import br.com.arenadev.session.SessionJoinService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/join/{code}/activities/{activityId}/submissions/{submissionId}/evidence")
public class ParticipantProcessEvidenceController {
    private final SessionJoinService joinService;
    private final ActivitySubmissionRepository submissionRepository;
    private final SubmissionProcessEvidenceService evidenceService;

    public ParticipantProcessEvidenceController(
            SessionJoinService joinService,
            ActivitySubmissionRepository submissionRepository,
            SubmissionProcessEvidenceService evidenceService
    ) {
        this.joinService = joinService;
        this.submissionRepository = submissionRepository;
        this.evidenceService = evidenceService;
    }

    @PostMapping("/paste")
    public void paste(
            @PathVariable String code,
            @PathVariable UUID activityId,
            @PathVariable UUID submissionId,
            @RequestHeader("X-Participant-Token") String token,
            @RequestBody PasteRequest request
    ) {
        SessionJoinService.JoinAccessView access = joinService.validateJoinAccess(code, token);
        ActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Entrega não encontrada."));
        if (!submission.getActivity().getId().equals(activityId)
                || !submission.getEnrollment().getStudent().getId().equals(access.studentId())) {
            throw new IllegalArgumentException("Entrega não pertence ao participante autenticado.");
        }
        evidenceService.recordPaste(activityId, submissionId, request.itemId(), request.characterCount());
    }

    public record PasteRequest(UUID itemId, int characterCount) {}
}
