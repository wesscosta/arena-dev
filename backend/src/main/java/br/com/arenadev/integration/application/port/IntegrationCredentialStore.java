package br.com.arenadev.integration.application.port;

import java.util.Optional;
import java.util.UUID;

public interface IntegrationCredentialStore {
    Optional<CredentialMaterial> read(UUID connectionId);
    String store(UUID connectionId, CredentialMaterial credential);
    void remove(UUID connectionId);

    /**
     * Transporte em memória apenas. Implementações não devem persistir o
     * conteúdo deste record em tabelas comuns nem registrá-lo em logs.
     */
    record CredentialMaterial(String accessToken, String refreshToken, String clientSecret) {}
}
