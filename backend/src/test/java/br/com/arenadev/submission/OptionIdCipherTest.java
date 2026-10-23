package br.com.arenadev.submission;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OptionIdCipherTest {
    private static final List<String> ORIGINAL = List.of("A", "B", "C", "D");

    private final OptionIdCipher cipher = new OptionIdCipher("segredo-de-teste", null);

    @Test
    void derivesStableBase64UrlIdsWithTenCharacters() {
        UUID submission = UUID.randomUUID();
        UUID question = UUID.randomUUID();

        List<String> first = ORIGINAL.stream().map(id -> cipher.opaque(submission, question, id)).toList();
        List<String> second = ORIGINAL.stream().map(id -> cipher.opaque(submission, question, id)).toList();

        assertThat(first).isEqualTo(second).doesNotHaveDuplicates()
                .allSatisfy(id -> assertThat(id).hasSize(10).matches("[A-Za-z0-9_-]{10}"));
    }

    @Test
    void differentAttemptsQuestionsOrSecretsGetDifferentIds() {
        UUID question = UUID.randomUUID();
        UUID submission = UUID.randomUUID();
        String id = cipher.opaque(submission, question, "B");

        assertThat(cipher.opaque(UUID.randomUUID(), question, "B")).isNotEqualTo(id);
        assertThat(cipher.opaque(submission, UUID.randomUUID(), "B")).isNotEqualTo(id);
        assertThat(new OptionIdCipher("outro-segredo", null).opaque(submission, question, "B")).isNotEqualTo(id);
    }

    @Test
    void resolvesOnlyIdsOfTheSameAttemptAndQuestion() {
        UUID submission = UUID.randomUUID();
        UUID question = UUID.randomUUID();
        String opaqueB = cipher.opaque(submission, question, "B");

        assertThat(cipher.original(submission, question, ORIGINAL, opaqueB)).contains("B");
        assertThat(cipher.original(submission, question, ORIGINAL, "B")).isEmpty();
        assertThat(cipher.original(UUID.randomUUID(), question, ORIGINAL, opaqueB)).isEmpty();
        assertThat(cipher.original(submission, UUID.randomUUID(), ORIGINAL, opaqueB)).isEmpty();
        assertThat(cipher.original(submission, question, ORIGINAL, null)).isEmpty();
    }
}
