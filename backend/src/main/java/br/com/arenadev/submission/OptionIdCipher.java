package br.com.arenadev.submission;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

/**
 * Ids opacos das alternativas enviadas ao participante. Cada tentativa recebe
 * ids próprios e estáveis, derivados por HMAC-SHA256 de submissionId,
 * questionId e o id original; o banco e as visões do professor continuam com
 * o id original.
 *
 * O segredo vem de APP_ACTIVITY_OPTION_SECRET. Sem a variável, é gerado uma
 * vez com SecureRandom e guardado em app_secrets, para sobreviver a reinícios.
 */
@Component
public class OptionIdCipher {
    static final String SECRET_NAME = "activity-option-id";
    private static final int OPAQUE_LENGTH = 10;
    private static final int GENERATED_BYTES = 32;

    private final SecretKeySpec key;

    public OptionIdCipher(
            @Value("${app.activity.option-id-secret:}") String configuredSecret,
            JdbcTemplate jdbc
    ) {
        byte[] secret = configuredSecret == null || configuredSecret.isBlank()
                ? storedSecret(jdbc)
                : configuredSecret.getBytes(StandardCharsets.UTF_8);
        this.key = new SecretKeySpec(secret, "HmacSHA256");
    }

    public String opaque(UUID submissionId, UUID questionId, String originalId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            byte[] digest = mac.doFinal((submissionId + ":" + questionId + ":" + originalId)
                    .getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest).substring(0, OPAQUE_LENGTH);
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("HMAC-SHA256 indisponível.", error);
        }
    }

    /** Id original cujo id opaco, nesta tentativa e questão, é o informado. */
    public Optional<String> original(UUID submissionId, UUID questionId, Collection<String> originalIds, String opaqueId) {
        if (opaqueId == null) return Optional.empty();
        byte[] candidate = opaqueId.getBytes(StandardCharsets.UTF_8);
        String match = null;
        for (String originalId : originalIds) {
            byte[] expected = opaque(submissionId, questionId, originalId).getBytes(StandardCharsets.UTF_8);
            if (MessageDigest.isEqual(expected, candidate)) match = originalId;
        }
        return Optional.ofNullable(match);
    }

    private static byte[] storedSecret(JdbcTemplate jdbc) {
        byte[] generated = new byte[GENERATED_BYTES];
        new SecureRandom().nextBytes(generated);
        // Duas instâncias subindo juntas: a primeira grava, as demais leem o mesmo valor.
        jdbc.update(
                "insert into app_secrets (name, secret_base64) values (?, ?) on conflict (name) do nothing",
                SECRET_NAME,
                Base64.getEncoder().encodeToString(generated)
        );
        String stored = jdbc.queryForObject(
                "select secret_base64 from app_secrets where name = ?", String.class, SECRET_NAME
        );
        return Base64.getDecoder().decode(stored);
    }
}
