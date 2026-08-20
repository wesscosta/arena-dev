package br.com.controlealunos.domain;

public record Aluno(
        int matricula,
        String nome,
        String email,
        String cpf,
        char sexo,
        Endereco endereco
) {
    public Aluno {
        endereco = endereco == null ? Endereco.vazio() : endereco;
    }
}
