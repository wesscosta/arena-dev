package br.com.arenadev.learning;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LearningDomainTest {
    @Test
    void learningTargetKeepsPedagogicalHierarchySeparateFromContentMetadata() {
        LearningTarget sql = new LearningTarget("SQL", LearningTargetType.TOPIC, null);
        LearningTarget join = new LearningTarget(" JOIN ", LearningTargetType.TOPIC, sql);

        assertThat(join.getTitle()).isEqualTo("JOIN");
        assertThat(join.getParent()).isSameAs(sql);
        assertThat(join.getStatus()).isEqualTo(LearningTargetStatus.ACTIVE);

        join.archive();
        assertThat(join.getStatus()).isEqualTo(LearningTargetStatus.ARCHIVED);

        join.activate();
        assertThat(join.getStatus()).isEqualTo(LearningTargetStatus.ACTIVE);
    }

    @Test
    void learningTargetRejectsMissingTitleAndDirectSelfParenting() {
        assertThatThrownBy(() -> new LearningTarget(" ", LearningTargetType.TOPIC, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("título");

        LearningTarget target = new LearningTarget("LEFT JOIN", LearningTargetType.OBJECTIVE, null);
        assertThatThrownBy(() -> target.changeParent(target))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("pai de si mesmo");
    }

    @Test
    void contentRefIsProviderAgnosticAndKeepsOptionalVersionAndAnchor() {
        ContentRef ref = new ContentRef(
                "LEARNING_RESOURCE",
                UUID.randomUUID().toString(),
                3,
                "capitulo-join"
        );

        assertThat(ref.sourceType()).isEqualTo("LEARNING_RESOURCE");
        assertThat(ref.sourceVersion()).isEqualTo(3);
        assertThat(ref.anchor()).isEqualTo("capitulo-join");

        assertThatThrownBy(() -> new ContentRef("LIBRARY", "id", 0, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positiva");
    }

    @Test
    void provenancePreservesOriginWithoutTreatingAiAsAuthority() {
        Instant observedAt = Instant.parse("2026-10-07T02:00:00Z");
        Provenance provenance = new Provenance(
                ProvenanceOrigin.AI,
                "resource:123",
                UUID.randomUUID(),
                null,
                observedAt
        );

        assertThat(provenance.origin()).isEqualTo(ProvenanceOrigin.AI);
        assertThat(provenance.sourceRef()).isEqualTo("resource:123");
        assertThat(provenance.reviewedBy()).isNull();
        assertThat(provenance.createdAt()).isEqualTo(observedAt);
    }
}
