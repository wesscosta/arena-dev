package br.com.arenadev.draw;

/** Business-state conflict: a command cannot be applied to the current draw state. */
public class DrawConflictException extends IllegalArgumentException {
    public DrawConflictException(String message) { super(message); }
}
