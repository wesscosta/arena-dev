package br.com.arenadev.draw;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DrawAttemptScoreLinkRepository extends JpaRepository<DrawAttemptScoreLink,UUID> {}
