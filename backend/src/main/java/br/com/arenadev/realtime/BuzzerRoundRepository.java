package br.com.arenadev.realtime;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.UUID;

public interface BuzzerRoundRepository extends JpaRepository<BuzzerRound, UUID> {
    Optional<BuzzerRound> findFirstBySessionIdOrderByOpenedAtDesc(UUID sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BuzzerRound> findFirstBySessionIdAndStatusOrderByOpenedAtDesc(UUID sessionId, BuzzerRoundStatus status);
}
