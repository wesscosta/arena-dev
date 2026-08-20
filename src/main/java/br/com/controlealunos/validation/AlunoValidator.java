package br.com.controlealunos.validation;

import br.com.controlealunos.domain.Aluno;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public class AlunoValidator {
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$",
            Pattern.CASE_INSENSITIVE
    );

    public List<String> validate(Aluno aluno) {
        List<String> errors = new ArrayList<>();

        if (aluno.matricula() <= 0) {
            errors.add("Matrícula deve ser um número maior que zero.");
        }
        if (aluno.nome() == null || aluno.nome().isBlank()) {
            errors.add("Nome é obrigatório.");
        } else if (aluno.nome().trim().length() < 2) {
            errors.add("Nome deve possuir pelo menos 2 caracteres.");
        }
        if (aluno.email() != null && !aluno.email().isBlank()
                && !EMAIL_PATTERN.matcher(aluno.email().trim()).matches()) {
            errors.add("E-mail possui formato inválido.");
        }
        char sexo = Character.toUpperCase(aluno.sexo());
        if (sexo != 'M' && sexo != 'F' && sexo != 'N') {
            errors.add("Sexo deve ser M, F ou N (não informado).");
        }
        if (aluno.endereco().numero() != null && aluno.endereco().numero() < 0) {
            errors.add("Número do endereço não pode ser negativo.");
        }
        if (aluno.endereco().estado() != null && !aluno.endereco().estado().isBlank()
                && aluno.endereco().estado().trim().length() != 2) {
            errors.add("Estado deve ser informado pela UF com 2 caracteres.");
        }

        return errors;
    }
}
