package br.com.controlealunos.validation;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.domain.Endereco;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlunoValidatorTest {
    private final AlunoValidator validator = new AlunoValidator();

    @Test
    void deveAceitarAlunoValido() {
        Aluno aluno = new Aluno(
                1001,
                "Maria Silva",
                "maria@example.com",
                "",
                'F',
                Endereco.vazio()
        );

        assertTrue(validator.validate(aluno).isEmpty());
    }

    @Test
    void deveRejeitarMatriculaNomeEEmailInvalidos() {
        Aluno aluno = new Aluno(
                0,
                "",
                "email-invalido",
                "",
                'X',
                Endereco.vazio()
        );

        var errors = validator.validate(aluno);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(value -> value.contains("Matrícula")));
        assertTrue(errors.stream().anyMatch(value -> value.contains("Nome")));
        assertTrue(errors.stream().anyMatch(value -> value.contains("E-mail")));
        assertTrue(errors.stream().anyMatch(value -> value.contains("Sexo")));
    }
}
