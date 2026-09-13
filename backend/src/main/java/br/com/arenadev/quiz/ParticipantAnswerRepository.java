package br.com.arenadev.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ParticipantAnswerRepository extends JpaRepository<ParticipantAnswer, UUID> {
    Optional<ParticipantAnswer> findByRoundIdAndParticipantId(UUID roundId, UUID participantId);
    List<ParticipantAnswer> findByRoundIdOrderBySubmittedAtAsc(UUID roundId);
}
