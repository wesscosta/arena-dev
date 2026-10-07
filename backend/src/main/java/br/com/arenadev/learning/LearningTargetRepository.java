package br.com.arenadev.learning;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearningTargetRepository extends JpaRepository<LearningTarget, UUID> {
    List<LearningTarget> findByParentIdAndStatusOrderByTitleAsc(
            UUID parentId,
            LearningTargetStatus status
    );

    List<LearningTarget> findByParentIsNullAndStatusOrderByTitleAsc(
            LearningTargetStatus status
    );
}
