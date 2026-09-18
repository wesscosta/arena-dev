package br.com.arenadev.integration.api;

import br.com.arenadev.integration.application.IntegrationNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackageClasses = IntegrationAdminController.class)
public class IntegrationApiExceptionHandler {

    @ExceptionHandler(IntegrationNotFoundException.class)
    ProblemDetail notFound(IntegrationNotFoundException error) {
        var problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Integration resource not found");
        problem.setDetail(error.getMessage());
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail badRequest(IllegalArgumentException error) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Invalid integration request");
        problem.setDetail(error.getMessage());
        return problem;
    }

    @ExceptionHandler(IllegalStateException.class)
    ProblemDetail conflict(IllegalStateException error) {
        var problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setTitle("Invalid integration state");
        problem.setDetail(error.getMessage());
        return problem;
    }
}
