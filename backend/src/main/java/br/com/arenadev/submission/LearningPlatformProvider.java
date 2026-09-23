
package br.com.arenadev.submission;

/**
 * @deprecated Contrato legado do V25. Novas integrações devem usar
 * {@code br.com.arenadev.integration.domain.LearningPlatformProvider}.
 * Este enum permanece até a migração de persistência do 15.0C/V26.
 */
@Deprecated(forRemoval = true)
public enum LearningPlatformProvider {
    TEAMS,
    GOOGLE_CLASSROOM
}
