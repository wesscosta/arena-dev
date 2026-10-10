package br.com.arenadev.learning.presentation;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Explicit, safe teacher-facing reason for rejected public material. */
public final class MaterialPresentationValidationException extends ResponseStatusException {
    public MaterialPresentationValidationException(String reason) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, reason);
    }
}
