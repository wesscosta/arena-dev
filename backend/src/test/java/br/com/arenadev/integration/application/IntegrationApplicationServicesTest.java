package br.com.arenadev.integration.application;

import br.com.arenadev.integration.domain.*;
import br.com.arenadev.integration.persistence.*;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class IntegrationApplicationServicesTest {
    private static final Instant NOW = Instant.parse("2026-09-18T15:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void createsTenantConnectionIdempotently() {
        var repo = mock(IntegrationConnectionRepository.class);
        when(repo.findByProviderAndExternalTenantId(LearningPlatformProvider.MICROSOFT_TEAMS, "tenant-1"))
                .thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var service = new IntegrationConnectionService(repo, CLOCK);
        var created = service.create(
                LearningPlatformProvider.MICROSOFT_TEAMS, "Senac", "tenant-1"
        );

        when(repo.findByProviderAndExternalTenantId(LearningPlatformProvider.MICROSOFT_TEAMS, "tenant-1"))
                .thenReturn(Optional.of(created));

        var again = service.create(
                LearningPlatformProvider.MICROSOFT_TEAMS, "Outro nome", "tenant-1"
        );

        assertThat(again.getId()).isEqualTo(created.getId());
        verify(repo, times(1)).save(any());
    }

    @Test
    void classroomLinkIsIdempotentByConnectionAndClassroom() {
        var connections = mock(IntegrationConnectionRepository.class);
        var classrooms = mock(ExternalClassroomLinkRepository.class);
        var students = mock(ExternalStudentLinkRepository.class);
        var activities = mock(ExternalActivityLinkRepository.class);
        var submissions = mock(ExternalSubmissionLinkRepository.class);

        UUID connectionId = UUID.randomUUID();
        UUID classroomId = UUID.randomUUID();
        when(connections.existsById(connectionId)).thenReturn(true);
        when(classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId))
                .thenReturn(Optional.empty());
        when(classrooms.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var service = new ExternalLinkService(
                connections, classrooms, students, activities, submissions, CLOCK
        );

        var first = service.linkClassroom(connectionId, classroomId, "class-1", null);
        when(classrooms.findByConnectionIdAndClassroomId(connectionId, classroomId))
                .thenReturn(Optional.of(first));

        var second = service.linkClassroom(connectionId, classroomId, "class-1", null);

        assertThat(second.getId()).isEqualTo(first.getId());
        verify(classrooms, times(1)).save(any());
    }

    @Test
    void beginSyncReusesOpenExecutionForSameScopeAndDirection() {
        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);
        UUID connectionId = UUID.randomUUID();

        when(connections.existsById(connectionId)).thenReturn(true);
        when(executions.findFirstByConnectionIdAndScopeAndDirectionAndStatusInOrderByCreatedAtDesc(
                eq(connectionId), eq("SUBMISSIONS"), eq(SyncDirection.IMPORT), anyCollection()
        )).thenReturn(Optional.empty());
        when(executions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var service = new SyncExecutionService(connections, executions, items, CLOCK);
        var first = service.begin(connectionId, "SUBMISSIONS", SyncDirection.IMPORT);

        when(executions.findFirstByConnectionIdAndScopeAndDirectionAndStatusInOrderByCreatedAtDesc(
                eq(connectionId), eq("SUBMISSIONS"), eq(SyncDirection.IMPORT), anyCollection()
        )).thenReturn(Optional.of(first));

        var second = service.begin(connectionId, "SUBMISSIONS", SyncDirection.IMPORT);

        assertThat(second.getId()).isEqualTo(first.getId());
        verify(executions, times(1)).save(any());
    }

    @Test
    void syncItemIsIdempotentByExecutionTypeAndKey() {
        var connections = mock(IntegrationConnectionRepository.class);
        var executions = mock(SyncExecutionRepository.class);
        var items = mock(SyncItemRepository.class);

        UUID executionId = UUID.randomUUID();
        var execution = new SyncExecutionEntity(
                executionId, UUID.randomUUID(), "SUBMISSIONS", SyncDirection.IMPORT, NOW
        );
        when(executions.findById(executionId)).thenReturn(Optional.of(execution));
        when(items.findByExecutionIdAndItemTypeAndItemKey(executionId, "SUBMISSION", "ext-1"))
                .thenReturn(Optional.empty());
        when(items.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var service = new SyncExecutionService(connections, executions, items, CLOCK);
        var first = service.registerItem(executionId, "SUBMISSION", "ext-1");

        when(items.findByExecutionIdAndItemTypeAndItemKey(executionId, "SUBMISSION", "ext-1"))
                .thenReturn(Optional.of(first));

        var second = service.registerItem(executionId, "SUBMISSION", "ext-1");

        assertThat(second.getId()).isEqualTo(first.getId());
        verify(items, times(1)).save(any());
    }
}
