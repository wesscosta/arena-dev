package br.com.arenadev.wordcloud;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WordCloudSubmissionRepository extends JpaRepository<WordCloudSubmission, UUID> {
    List<WordCloudSubmission> findByRoundIdOrderByCreatedAtAsc(UUID roundId);
    List<WordCloudSubmission> findByRoundIdAndParticipantIdOrderByCreatedAtAsc(
            UUID roundId,
            UUID participantId
    );
}
