package br.com.arenadev.interaction;

import br.com.arenadev.wordcloud.WordCloudRound;
import br.com.arenadev.wordcloud.WordCloudSubmission;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WordCloudInteractionAdapterTest {
    private final WordCloudInteractionAdapter adapter =
            new WordCloudInteractionAdapter(JsonMapper.builder().build());

    @Test
    void mapsWordCloudToTextListPresentationWithoutEvaluationOrEvidence() {
        UUID roundId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-10-07T12:00:00Z");
        WordCloudRound round = mock(WordCloudRound.class);
        when(round.getId()).thenReturn(roundId);
        when(round.getPrompt()).thenReturn("Uma palavra sobre SQL");
        when(round.getMaxWordsPerParticipant()).thenReturn(3);
        when(round.getCreatedAt()).thenReturn(createdAt);

        InteractionDefinition definition = adapter.toDefinition(round);

        assertThat(definition.getResponseKind())
                .isEqualTo(InteractionResponseKind.TEXT);
        assertThat(definition.getEvaluationMode())
                .isEqualTo(InteractionEvaluationMode.NONE);
        assertThat(definition.getPresentationMode())
                .isEqualTo(InteractionPresentationMode.WORD_CLOUD);
        assertThat(definition.getSubmissionPolicy())
                .isEqualTo(InteractionSubmissionPolicy.UPDATE_UNTIL_CLOSE);
        assertThat(definition.isProducesEvidence()).isFalse();
        assertThat(definition.getLearningTarget()).isNull();
        assertThat(definition.getResponseConfigJson())
                .contains("\"mode\":\"LIST\"")
                .contains("\"maxItems\":3")
                .contains("\"maxItemLength\":60");
        assertThat(definition.provenance().sourceRef())
                .isEqualTo("word-cloud-round:" + roundId);
        assertThat(definition.provenance().createdAt())
                .isEqualTo(createdAt);
    }

    @Test
    void mapsParticipantTermsToCanonicalTextList() {
        WordCloudSubmission first = mock(WordCloudSubmission.class);
        WordCloudSubmission second = mock(WordCloudSubmission.class);
        when(first.getRawText()).thenReturn("Java");
        when(second.getRawText()).thenReturn("Programação");

        assertThat(adapter.toCanonicalResponse(List.of(first, second)))
                .isEqualTo(
                        "{\"texts\":[\"Java\",\"Programação\"]}"
                );
    }
}
