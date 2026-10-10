package br.com.arenadev.scoring;

/** A distinct score correction command conflicts with an already finalized reversal. */
public class ScoreConflictException extends RuntimeException {
    public ScoreConflictException(String message) { super(message); }
}
