package br.com.arenadev.integration.provider.microsoft;

import br.com.arenadev.integration.application.IntegrationConnectionService;
import br.com.arenadev.integration.application.IntegrationNotFoundException;
import br.com.arenadev.integration.domain.IntegrationConnectionStatus;
import br.com.arenadev.integration.domain.LearningPlatformProvider;
import br.com.arenadev.integration.persistence.ExternalClassroomLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class MicrosoftRosterDiscoveryService {
    private final IntegrationConnectionService connections;
    private final ExternalClassroomLinkRepository classroomLinks;
    private final MicrosoftGraphTokenProvider tokenProvider;
    private final MicrosoftGraphEducationClient graph;

    public MicrosoftRosterDiscoveryService(
            IntegrationConnectionService connections,
            ExternalClassroomLinkRepository classroomLinks,
            MicrosoftGraphTokenProvider tokenProvider,
            MicrosoftGraphEducationClient graph
    ) {
        this.connections = connections;
        this.classroomLinks = classroomLinks;
        this.tokenProvider = tokenProvider;
        this.graph = graph;
    }

    @Transactional(readOnly = true)
    public RosterResult discover(UUID connectionId, UUID classroomLinkId) {
        var connection = connections.required(connectionId);

        if (connection.getProvider() != LearningPlatformProvider.MICROSOFT_TEAMS) {
            throw new IllegalArgumentException(
                    "A conexão informada não pertence ao provider MICROSOFT_TEAMS."
            );
        }

        if (connection.getStatus() != IntegrationConnectionStatus.ACTIVE) {
            throw new IllegalStateException(
                    "A conexão Microsoft precisa estar ACTIVE para consultar o roster."
            );
        }

        var classroomLink = classroomLinks.findById(classroomLinkId)
                .filter(link -> link.getConnectionId().equals(connectionId))
                .orElseThrow(() -> new IntegrationNotFoundException(
                        "Vínculo de turma Microsoft não encontrado nesta conexão: "
                                + classroomLinkId
                ));

        String tenantId = required(
                connection.getExternalTenantId(),
                "tenantId da conexão Microsoft"
        );

        var token = tokenProvider.acquire(tenantId);
        var members = graph.listClassMembers(
                token.token(),
                classroomLink.getExternalClassroomId()
        );

        long students = members.stream()
                .filter(MicrosoftEducationUser::isStudent)
                .count();
        long teachers = members.stream()
                .filter(MicrosoftEducationUser::isTeacher)
                .count();

        return new RosterResult(
                connectionId,
                classroomLinkId,
                classroomLink.getClassroomId(),
                classroomLink.getExternalClassroomId(),
                members,
                students,
                teachers
        );
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " é obrigatório.");
        }
        return value.trim();
    }

    public record RosterResult(
            UUID connectionId,
            UUID classroomLinkId,
            UUID classroomId,
            String microsoftClassId,
            List<MicrosoftEducationUser> members,
            long studentCount,
            long teacherCount
    ) {
        public RosterResult {
            members = List.copyOf(members);
        }
    }
}
