package br.com.arenadev.shared;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ApiExceptionHandlerStateTest {
    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void domainStateConflictIsA409WithItsMessage() {
        var response = handler.illegalState(new IllegalStateException("Somente entregas enviadas podem entrar em correção."));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "Somente entregas enviadas podem entrar em correção.");
    }

    @Test
    void internalFailureIsA500WithoutLeakingDetails() {
        var response = handler.illegalState(
                new IllegalStateException("Falha ao serializar evento em tempo real.", new RuntimeException("jackson")));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(String.valueOf(response.getBody().get("message"))).doesNotContain("jackson").contains("Erro interno");
    }
}
