package br.com.arenadev.integration.application;

import br.com.arenadev.integration.application.port.IntegrationCredentialStore;
import br.com.arenadev.integration.persistence.IntegrationCredentialEntity;
import br.com.arenadev.integration.persistence.IntegrationCredentialRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Component
public class EncryptedIntegrationCredentialStore implements IntegrationCredentialStore {
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final IntegrationCredentialRepository repository;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public EncryptedIntegrationCredentialStore(
            IntegrationCredentialRepository repository,
            @Value("${app.integrations.credential-encryption-key:}") String encodedKey
    ) {
        this.repository = repository;
        this.key = keyOrNull(encodedKey);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CredentialMaterial> read(UUID connectionId) {
        return repository.findById(connectionId).map(entity ->
                new CredentialMaterial(
                        decrypt(entity.getEncryptedAccessToken()),
                        decrypt(entity.getEncryptedRefreshToken()),
                        null,
                        entity.getAccessTokenExpiresAt()
                )
        );
    }

    @Override
    @Transactional
    public String store(UUID connectionId, CredentialMaterial credential) {
        OffsetDateTime now = OffsetDateTime.now();
        String access = encrypt(credential.accessToken());
        String refresh = encrypt(credential.refreshToken());

        var entity = repository.findById(connectionId)
                .orElseGet(() -> new IntegrationCredentialEntity(
                        connectionId,
                        access,
                        refresh,
                        credential.expiresAt(),
                        now
                ));

        if (repository.existsById(connectionId)) {
            entity.update(access, refresh, credential.expiresAt(), now);
        }

        repository.save(entity);
        return "secure-store://integration/" + connectionId;
    }

    @Override
    @Transactional
    public void remove(UUID connectionId) {
        repository.deleteById(connectionId);
    }

    private String encrypt(String value) {
        if (value == null || value.isBlank()) return null;
        requireKey();
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao criptografar credencial de integração.", error);
        }
    }

    private String decrypt(String value) {
        if (value == null || value.isBlank()) return null;
        requireKey();
        try {
            byte[] payload = Base64.getDecoder().decode(value);
            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[payload.length - IV_LENGTH];
            System.arraycopy(payload, 0, iv, 0, IV_LENGTH);
            System.arraycopy(payload, IV_LENGTH, encrypted, 0, encrypted.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception error) {
            throw new IllegalStateException("Falha ao descriptografar credencial de integração.", error);
        }
    }

    private void requireKey() {
        if (key == null) {
            throw new IllegalStateException(
                    "APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY não configurada."
            );
        }
    }

    private static SecretKeySpec keyOrNull(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return null;
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(encoded.trim());
        } catch (IllegalArgumentException error) {
            throw new IllegalStateException(
                    "APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY deve estar em Base64.",
                    error
            );
        }
        if (raw.length != 32) {
            throw new IllegalStateException(
                    "APP_INTEGRATIONS_CREDENTIAL_ENCRYPTION_KEY deve representar exatamente 32 bytes."
            );
        }
        return new SecretKeySpec(raw, "AES");
    }
}
