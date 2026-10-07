package br.com.arenadev.learning;

import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class LearningTargetService {
    private final LearningTargetRepository repository;

    public LearningTargetService(LearningTargetRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<TargetView> listActive() {
        return repository.findByStatusOrderByTitleAsc(LearningTargetStatus.ACTIVE)
                .stream()
                .map(TargetView::from)
                .toList();
    }

    @Transactional
    public TargetView create(CreateCommand command) {
        LearningTarget parent = command.parentId() == null
                ? null
                : repository.findById(command.parentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Objetivo de aprendizagem pai não encontrado."
                ));

        if (parent != null && parent.getStatus() != LearningTargetStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "O objetivo de aprendizagem pai precisa estar ativo."
            );
        }

        LearningTarget target = repository.save(
                new LearningTarget(command.title(), command.type(), parent)
        );
        return TargetView.from(target);
    }

    @Transactional
    public TargetView archive(UUID id) {
        LearningTarget target = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Objetivo de aprendizagem não encontrado."
                ));
        target.archive();
        return TargetView.from(target);
    }

    public record CreateCommand(
            String title,
            LearningTargetType type,
            UUID parentId
    ) {}

    public record TargetView(
            UUID id,
            String title,
            LearningTargetType type,
            UUID parentId,
            LearningTargetStatus status
    ) {
        static TargetView from(LearningTarget target) {
            return new TargetView(
                    target.getId(),
                    target.getTitle(),
                    target.getType(),
                    target.getParent() == null ? null : target.getParent().getId(),
                    target.getStatus()
            );
        }
    }
}
