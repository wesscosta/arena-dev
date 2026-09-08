package br.com.arenadev.poll;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PollVoteRepository extends JpaRepository<PollVote, UUID> {
    List<PollVote> findByRoundIdOrderByCreatedAtAsc(UUID roundId);
    Optional<PollVote> findByRoundIdAndParticipantId(UUID roundId, UUID participantId);
    long countByRoundId(UUID roundId);
}
