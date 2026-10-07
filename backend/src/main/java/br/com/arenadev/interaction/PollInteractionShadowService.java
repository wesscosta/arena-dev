package br.com.arenadev.interaction;

import br.com.arenadev.poll.PollRound;
import br.com.arenadev.poll.PollRoundRepository;
import br.com.arenadev.poll.PollVote;
import br.com.arenadev.poll.PollVoteRepository;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.ClassSessionRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class PollInteractionShadowService {
    private final PollRoundRepository pollRoundRepository;
    private final PollVoteRepository voteRepository;
    private final ClassSessionRepository sessionRepository;
    private final PollInteractionShadowLinkRepository linkRepository;
    private final InteractionDefinitionRepository definitionRepository;
    private final InteractionRunRepository runRepository;
    private final InteractionResponseService responseService;
    private final InteractionResultEngine resultEngine;
    private final PollInteractionAdapter adapter;

    public PollInteractionShadowService(
            PollRoundRepository pollRoundRepository,
            PollVoteRepository voteRepository,
            ClassSessionRepository sessionRepository,
            PollInteractionShadowLinkRepository linkRepository,
            InteractionDefinitionRepository definitionRepository,
            InteractionRunRepository runRepository,
            InteractionResponseService responseService,
            InteractionResultEngine resultEngine,
            PollInteractionAdapter adapter
    ) {
        this.pollRoundRepository = pollRoundRepository;
        this.voteRepository = voteRepository;
        this.sessionRepository = sessionRepository;
        this.linkRepository = linkRepository;
        this.definitionRepository = definitionRepository;
        this.runRepository = runRepository;
        this.responseService = responseService;
        this.resultEngine = resultEngine;
        this.adapter = adapter;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ShadowComparison compare(UUID pollRoundId) {
        SyncContext context = syncInternal(pollRoundId);
        InteractionResultEngine.ResultView shadow =
                resultEngine.result(context.link().getRun().getId());
        LegacyResult legacy = legacyResult(
                context.votes(),
                context.link().getDefinition()
        );

        ArrayList<String> mismatches = new ArrayList<>();
        if (legacy.responseCount() != shadow.participation().responseCount()) {
            mismatches.add("responseCount");
        }
        if (!legacy.distribution().equals(shadow.choiceDistribution())) {
            mismatches.add("distribution");
        }
        if (shadow.evaluation().evaluationCount() != 0
                || shadow.evaluation().accuracy() != null) {
            mismatches.add("unexpectedEvaluation");
        }

        return new ShadowComparison(
                pollRoundId,
                context.link().getRun().getId(),
                mismatches.isEmpty(),
                List.copyOf(mismatches),
                legacy,
                shadow
        );
    }

    private SyncContext syncInternal(UUID pollRoundId) {
        PollRound round = pollRoundRepository.findByIdForUpdate(pollRoundId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Votação não encontrada."
                ));
        PollInteractionShadowLink link = linkRepository
                .findByPollRoundIdWithGraph(pollRoundId)
                .orElseGet(() -> createLink(round));

        InteractionRun run = link.getRun();
        List<PollVote> votes =
                voteRepository.findByRoundIdOrderByCreatedAtAsc(pollRoundId);

        if (run.getStatus() == InteractionRunStatus.CLOSED) {
            return new SyncContext(round, link, votes);
        }

        if (run.getStatus() == InteractionRunStatus.CREATED) {
            run.open(round.getCreatedAt());
        }

        if (run.acceptsResponses()) {
            syncVotes(run, votes);
        }

        if (round.resultsVisiblePublicly() && !run.resultsVisiblePublicly()) {
            run.revealResults(resultRevealTime(round));
        }

        if (round.getClosedAt() != null
                && run.getStatus() != InteractionRunStatus.CLOSED) {
            run.close(round.getClosedAt());
        }

        return new SyncContext(round, link, votes);
    }

    private PollInteractionShadowLink createLink(PollRound round) {
        ClassSession session = sessionRepository
                .findByIdForUpdate(round.getSession().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sessão da votação não encontrada."
                ));

        int sequence = runRepository
                .findFirstBySessionIdOrderBySequenceDesc(session.getId())
                .map(previous -> previous.getSequence() + 1)
                .orElse(1);

        InteractionDefinition definition =
                definitionRepository.save(adapter.toDefinition(round));
        InteractionRun run = runRepository.save(
                new InteractionRun(session, definition, sequence)
        );
        return linkRepository.save(
                new PollInteractionShadowLink(round, definition, run)
        );
    }

    private void syncVotes(InteractionRun run, List<PollVote> votes) {
        for (PollVote vote : votes) {
            responseService.submit(
                    run.getId(),
                    vote.getParticipant().getId(),
                    adapter.toCanonicalResponse(vote)
            );
        }
    }

    private LegacyResult legacyResult(
            List<PollVote> votes,
            InteractionDefinition definition
    ) {
        LinkedHashMap<String, Long> distribution = new LinkedHashMap<>();
        for (InteractionOption option : definition.getOptions()) {
            distribution.put(option.getOptionKey(), 0L);
        }

        for (PollVote vote : votes) {
            String key = adapter.optionKey(vote.getOption());
            if (!distribution.containsKey(key)) {
                throw new IllegalStateException(
                        "Voto legado contém opção fora da definição shadow."
                );
            }
            distribution.computeIfPresent(
                    key,
                    (ignored, current) -> current + 1
            );
        }

        return new LegacyResult(
                votes.size(),
                Collections.unmodifiableMap(
                        new LinkedHashMap<>(distribution)
                )
        );
    }

    private static Instant resultRevealTime(PollRound round) {
        if (round.getRevealedAt() != null) return round.getRevealedAt();
        if (round.getClosedAt() != null) return round.getClosedAt();
        return round.getCreatedAt();
    }

    private record SyncContext(
            PollRound round,
            PollInteractionShadowLink link,
            List<PollVote> votes
    ) {}

    public record LegacyResult(
            long responseCount,
            Map<String, Long> distribution
    ) {}

    public record ShadowComparison(
            UUID pollRoundId,
            UUID interactionRunId,
            boolean equivalent,
            List<String> mismatches,
            LegacyResult legacy,
            InteractionResultEngine.ResultView shadow
    ) {
        public ShadowComparison {
            Objects.requireNonNull(mismatches);
        }
    }
}
