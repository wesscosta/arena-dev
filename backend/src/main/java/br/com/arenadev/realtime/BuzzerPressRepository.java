package br.com.arenadev.realtime;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BuzzerPressRepository extends JpaRepository<BuzzerPress, UUID> {
    List<BuzzerPress> findByRoundIdOrderByPositionAsc(UUID roundId);
    Optional<BuzzerPress> findByRoundIdAndParticipantId(UUID roundId, UUID participantId);
    long countByRoundId(UUID roundId);
}
