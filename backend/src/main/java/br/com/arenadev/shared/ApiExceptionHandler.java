package br.com.arenadev.shared;

import br.com.arenadev.auth.LoginRateLimitExceededException;
import br.com.arenadev.content.LearningResourceInUseException;
import br.com.arenadev.learning.presentation.MaterialPresentationValidationException;
import br.com.arenadev.draw.DrawConflictException;
import br.com.arenadev.scoring.ScoreConflictException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(LoginRateLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> tooManyLoginAttempts(LoginRateLimitExceededException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.retryAfterSeconds()))
                .body(baseBody(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> unauthorized(AuthenticationException exception) {
        return response(HttpStatus.UNAUTHORIZED, "Usuário ou senha inválidos.");
    }

    @ExceptionHandler(MaterialPresentationValidationException.class)
    public ResponseEntity<Map<String, Object>> materialPresentation(
            MaterialPresentationValidationException exception) {
        // Show a meaningful rule to teachers without exposing source HTML,
        // SQL statements or internal exception details.
        return response(HttpStatus.UNPROCESSABLE_ENTITY, exception.getReason());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(ResourceNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(LearningResourceInUseException.class)
    public ResponseEntity<Map<String, Object>> conflict(LearningResourceInUseException exception) {
        return response(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(DrawConflictException.class)
    public ResponseEntity<Map<String, Object>> drawConflict(DrawConflictException exception) {
        return response(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(ScoreConflictException.class)
    public ResponseEntity<Map<String, Object>> scoreConflict(ScoreConflictException exception) {
        return response(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, DataIntegrityViolationException.class})
    public ResponseEntity<Map<String, Object>> badRequest(Exception exception) {
        String message = exception instanceof DataIntegrityViolationException
                ? "A operação viola uma regra de integridade dos dados."
                : exception.getMessage();
        return response(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage())
        );

        Map<String, Object> body = baseBody(HttpStatus.BAD_REQUEST, "Dados inválidos.");
        body.put("fields", fields);
        return ResponseEntity.badRequest().body(body);
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(baseBody(status, message));
    }

    private Map<String, Object> baseBody(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return body;
    }
}
