package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.integration.application.ExternalLinkService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MicrosoftClassLinkService {
    private final ClassroomRepository classrooms;
    private final MicrosoftClassDiscoveryService discovery;
    private final ExternalLinkService externalLinks;

    public MicrosoftClassLinkService(
            ClassroomRepository classrooms,
            MicrosoftClassDiscoveryService discovery,
            ExternalLinkService externalLinks
    ) {
        this.classrooms = classrooms;
        this.discovery = discovery;
        this.externalLinks = externalLinks;
    }

    @Transactional
    public LinkResult link(
            UUID connectionId,
            UUID classroomId,
            String microsoftClassId
    ) {
        if (!classrooms.existsById(classroomId)) {
            throw new IntegrationNotFoundException(
                    "Turma local não encontrada: " + classroomId
            );
        }

        String externalId = required(microsoftClassId, "microsoftClassId");

        var remote = discovery.discover(connectionId).classes().stream()
                .filter(it -> it.id().equals(externalId))
                .findFirst()
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Turma Microsoft não encontrada nesta conexão: " + externalId
                ));

        ExternalClassroomLinkEntity link = externalLinks.linkClassroom(
                connectionId,
                classroomId,
                remote.id(),
                null
        );

        return new LinkResult(
                link.getId(),
                connectionId,
                classroomId,
                remote.id(),
                remote.displayName(),
                remote.classCode()
        );
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return value.trim();
    }

    public record LinkResult(
            UUID linkId,
            UUID connectionId,
            UUID classroomId,
            String microsoftClassId,
            String microsoftDisplayName,
            String microsoftClassCode
    ) {}
}
