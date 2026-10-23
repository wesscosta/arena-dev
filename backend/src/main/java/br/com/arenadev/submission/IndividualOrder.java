package br.com.arenadev.submission;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Ordem individual por tentativa: Fisher-Yates com Random semeado, para que a
 * mesma tentativa veja sempre a mesma ordem. A semente sai de SHA-256 dos ids,
 * e não do hashCode dos UUIDs, para tentativas próximas não terem sementes
 * correlacionadas.
 */
public final class IndividualOrder {
    private IndividualOrder() {}

    public static long optionSeed(UUID submissionId, UUID questionId) {
        return seed(submissionId + ":" + questionId);
    }

    public static long questionSeed(UUID submissionId) {
        return seed(submissionId.toString());
    }

    public static <T> List<T> shuffle(List<T> items, long seed) {
        List<T> shuffled = new ArrayList<>(items);
        Random random = new Random(seed);
        for (int index = shuffled.size() - 1; index > 0; index--) {
            int other = random.nextInt(index + 1);
            T current = shuffled.get(index);
            shuffled.set(index, shuffled.get(other));
            shuffled.set(other, current);
        }
        return shuffled;
    }

    private static long seed(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(digest, 0, Long.BYTES).getLong();
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 indisponível.", error);
        }
    }
}
