package br.com.arenadev.interaction;

import br.com.arenadev.poll.PollOption;
import br.com.arenadev.poll.PollRound;
import br.com.arenadev.poll.PollVote;
import br.com.arenadev.session.ClassSession;
import br.com.arenadev.session.SessionParticipant;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PollInteractionAdapterTest {
    private final PollInteractionAdapter adapter =
            new PollInteractionAdapter(JsonMapper.builder().build());

    @Test
    void mapsPollToChoiceWithoutEvaluationOrEvidence() {
        UUID roundId = UUID.randomUUID();
        PollRound round = mock(PollRound.class);
        PollOption first = option(UUID.randomUUID(), "Java", 0);
        PollOption second = option(UUID.randomUUID(), "Python", 1);
        Instant createdAt = Instant.parse("2026-10-07T12:00:00Z");

        when(round.getId()).thenReturn(roundId);
        when(round.getPrompt()).thenReturn("Qual linguagem?");
        when(round.getCreatedAt()).thenReturn(createdAt);
        when(round.getOptions()).thenReturn(java.util.List.of(first, second));

        InteractionDefinition definition = adapter.toDefinition(round);

        assertThat(definition.getResponseKind()).isEqualTo(InteractionResponseKind.CHOICE);
        assertThat(definition.getEvaluationMode()).isEqualTo(InteractionEvaluationMode.NONE);
        assertThat(definition.getSubmissionPolicy()).isEqualTo(InteractionSubmissionPolicy.ONE_SUBMISSION);
        assertThat(definition.isProducesEvidence()).isFalse();
        assertThat(definition.getLearningTarget()).isNull();
        assertThat(definition.provenance().sourceRef()).isEqualTo("poll-round:" + roundId);
        assertThat(definition.provenance().createdAt()).isEqualTo(createdAt);
        assertThat(definition.getOptions()).extracting(InteractionOption::getOptionKey)
                .containsExactly(first.getId().toString(), second.getId().toString());
    }

    @Test
    void mapsLegacyVoteToCanonicalChoiceResponse() {
        PollOption option = option(UUID.randomUUID(), "Java", 0);
        PollVote vote = mock(PollVote.class);
        when(vote.getOption()).thenReturn(option);

        assertThat(adapter.toCanonicalResponse(vote))
                .isEqualTo("{\"selectedOptionKeys\":[\"" + option.getId() + "\"]}");
    }

    private static PollOption option(UUID id, String label, int position) {
        PollOption option = mock(PollOption.class);
        when(option.getId()).thenReturn(id);
        when(option.getLabel()).thenReturn(label);
        when(option.getPosition()).thenReturn(position);
        return option;
    }
}
