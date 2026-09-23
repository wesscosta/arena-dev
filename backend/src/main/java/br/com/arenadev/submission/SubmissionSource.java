
package br.com.arenadev.submission;

public enum SubmissionSource {
    ARENA,
    EXTERNAL,

    /**
     * @deprecated Origem específica do V25. Use EXTERNAL e resolva o
     * provider pelo ExternalSubmissionLink no Integration Core.
     */
    @Deprecated(forRemoval = true)
    TEAMS,

    /**
     * @deprecated Origem específica do V25. Use EXTERNAL e resolva o
     * provider pelo ExternalSubmissionLink no Integration Core.
     */
    @Deprecated(forRemoval = true)
    GOOGLE_CLASSROOM,
    IMPORT
}
