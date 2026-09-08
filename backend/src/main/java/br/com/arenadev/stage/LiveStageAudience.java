package br.com.arenadev.stage;

public enum LiveStageAudience {
    PROJECTOR,
    PARTICIPANTS,
    BOTH;

    public boolean includesProjector() {
        return this == PROJECTOR || this == BOTH;
    }

    public boolean includesParticipants() {
        return this == PARTICIPANTS || this == BOTH;
    }
}
